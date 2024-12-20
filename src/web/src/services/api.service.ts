/**
 * @fileoverview Core API service implementing secure HTTP communication with backend services,
 * including platform-specific handling, caching, rate limiting, and comprehensive error management.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'; // v1.6.0
import {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  ApiMethod,
  ApiErrorCode,
  isApiError,
  createApiError
} from '../types/api.types';
import {
  apiConfig,
  createApiClient,
  RetryConfig,
  CacheConfig,
  PlatformConfig
} from '../config/api.config';
import {
  getStoredToken,
  isTokenValid,
  refreshToken,
} from '../utils/auth.utils';
import {
  API_ENDPOINTS,
  API_TIMEOUT,
  API_RATE_LIMITS,
} from '../constants/api.constants';

/**
 * Core API service class implementing comprehensive request handling
 */
export class ApiService {
  private apiClient: AxiosInstance;
  private retryAttempts: number = 0;
  private rateLimiters: Map<string, number> = new Map();
  private responseCache: Map<string, { data: any; timestamp: number }> = new Map();
  private platformConfig: PlatformConfig;

  /**
   * Initialize API service with platform-specific configurations
   * @param platformConfig - Platform-specific configuration settings
   */
  constructor(platformConfig: PlatformConfig) {
    this.platformConfig = platformConfig;
    this.apiClient = createApiClient({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: this.getDefaultHeaders(),
      withCredentials: true
    });

    this.setupInterceptors();
  }

  /**
   * Make a generic HTTP request with comprehensive error handling and retries
   * @param method - HTTP method to use
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Additional request configuration
   * @returns Promise resolving to typed API response
   */
  public async request<T>(
    method: ApiMethod,
    url: string,
    data?: any,
    config: ApiRequestConfig & { platformType?: string } = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Validate token before request
      if (!(await isTokenValid())) {
        throw createApiError(ApiErrorCode.UNAUTHORIZED, 'Invalid or expired token');
      }

      // Check rate limits
      if (!this.checkRateLimit(url)) {
        throw createApiError(ApiErrorCode.RATE_LIMIT_EXCEEDED, 'Rate limit exceeded');
      }

      // Check cache for GET requests
      if (method === ApiMethod.GET) {
        const cachedResponse = this.getCachedResponse<T>(url);
        if (cachedResponse) return cachedResponse;
      }

      const response = await this.apiClient.request<ApiResponse<T>>({
        method,
        url,
        data,
        ...this.getRequestConfig(config)
      });

      // Cache successful GET responses
      if (method === ApiMethod.GET) {
        this.cacheResponse(url, response.data);
      }

      return response.data;
    } catch (error) {
      throw this.handleRequestError(error);
    }
  }

  /**
   * Make a GET request with caching support
   * @param url - Request URL
   * @param config - Additional request configuration
   * @returns Promise resolving to typed API response
   */
  public async get<T>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(ApiMethod.GET, url, undefined, config);
  }

  /**
   * Make a POST request with platform-specific handling
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Additional request configuration
   * @returns Promise resolving to typed API response
   */
  public async post<T>(
    url: string,
    data: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(ApiMethod.POST, url, data, config);
  }

  /**
   * Make a PUT request with validation
   * @param url - Request URL
   * @param data - Request payload
   * @param config - Additional request configuration
   * @returns Promise resolving to typed API response
   */
  public async put<T>(
    url: string,
    data: any,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(ApiMethod.PUT, url, data, config);
  }

  /**
   * Make a DELETE request with confirmation
   * @param url - Request URL
   * @param config - Additional request configuration
   * @returns Promise resolving to typed API response
   */
  public async delete<T>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(ApiMethod.DELETE, url, undefined, config);
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.apiClient.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (this.shouldRetryRequest(error)) {
          return this.retryRequest(error.config);
        }
        throw this.handleRequestError(error);
      }
    );
  }

  /**
   * Get default headers for requests
   */
  private getDefaultHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': '1.0.0',
      'X-Request-ID': this.generateRequestId()
    };
  }

  /**
   * Get request configuration with platform-specific settings
   */
  private getRequestConfig(config: ApiRequestConfig): AxiosRequestConfig {
    return {
      ...config,
      timeout: this.getTimeout(config),
      validateStatus: (status) => status >= 200 && status < 300
    };
  }

  /**
   * Check rate limits for the request
   */
  private checkRateLimit(url: string): boolean {
    const now = Date.now();
    const limit = this.getRateLimit(url);
    const lastRequest = this.rateLimiters.get(url) || 0;

    if (now - lastRequest < limit) {
      return false;
    }

    this.rateLimiters.set(url, now);
    return true;
  }

  /**
   * Get rate limit for specific endpoint
   */
  private getRateLimit(url: string): number {
    if (url.includes(API_ENDPOINTS.DETECTION.SEARCH)) {
      return API_RATE_LIMITS.PUBLIC_SEARCH;
    }
    return API_RATE_LIMITS.DETECTION_CRUD;
  }

  /**
   * Get timeout for specific request type
   */
  private getTimeout(config: ApiRequestConfig): number {
    if (config.timeout) return config.timeout;
    return API_TIMEOUT.DEFAULT;
  }

  /**
   * Handle request errors with detailed information
   */
  private handleRequestError(error: any): ApiError {
    if (isApiError(error)) return error;

    const apiError: ApiError = {
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      details: {},
      timestamp: new Date().toISOString()
    };

    if (error.response) {
      apiError.code = this.mapHttpStatusToErrorCode(error.response.status);
      apiError.message = error.response.data?.message || error.message;
      apiError.details = error.response.data;
    }

    return apiError;
  }

  /**
   * Map HTTP status codes to API error codes
   */
  private mapHttpStatusToErrorCode(status: number): ApiErrorCode {
    const statusMap: Record<number, ApiErrorCode> = {
      400: ApiErrorCode.BAD_REQUEST,
      401: ApiErrorCode.UNAUTHORIZED,
      403: ApiErrorCode.FORBIDDEN,
      404: ApiErrorCode.NOT_FOUND,
      429: ApiErrorCode.RATE_LIMIT_EXCEEDED
    };
    return statusMap[status] || ApiErrorCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cached response if available
   */
  private getCachedResponse<T>(url: string): ApiResponse<T> | null {
    const cached = this.responseCache.get(url);
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache response data
   */
  private cacheResponse(url: string, data: any): void {
    this.responseCache.set(url, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get valid authentication token
   */
  private async getValidToken(): Promise<string | null> {
    const token = getStoredToken();
    if (!token) return null;

    if (await isTokenValid()) {
      return token;
    }

    try {
      return await refreshToken();
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if request should be retried
   */
  private shouldRetryRequest(error: any): boolean {
    return (
      this.retryAttempts < 3 &&
      error.response?.status >= 500 &&
      error.config?.method === 'GET'
    );
  }

  /**
   * Retry failed request
   */
  private async retryRequest(config: AxiosRequestConfig): Promise<any> {
    this.retryAttempts++;
    await new Promise(resolve => setTimeout(resolve, 1000 * this.retryAttempts));
    return this.apiClient.request(config);
  }
}

// Export singleton instance
export default new ApiService(apiConfig.platformConfig);