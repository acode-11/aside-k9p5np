/**
 * @fileoverview Frontend API configuration with comprehensive settings for backend service communication
 * @version 1.0.0
 * @package @detection-platform/web
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios'; // v1.6.0
import {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  ApiErrorCode,
  ApiMethod,
  ApiCacheConfig,
  isApiError,
  createApiError
} from '../types/api.types';
import { API_ENDPOINTS, API_TIMEOUT, API_RATE_LIMITS, API_CACHE_TTL } from '../constants/api.constants';
import { PlatformType, PlatformAuthType } from '../types/platform.types';

/**
 * Platform-specific timeout configurations (milliseconds)
 */
const PLATFORM_SPECIFIC_TIMEOUTS: Record<PlatformType, number> = {
  [PlatformType.SIEM]: 45000, // 45 seconds
  [PlatformType.EDR]: 30000,  // 30 seconds
  [PlatformType.NSM]: 60000   // 60 seconds
};

/**
 * Platform-specific retry strategies
 */
const PLATFORM_RETRY_STRATEGIES: Record<PlatformType, RetryConfig> = {
  [PlatformType.SIEM]: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  },
  [PlatformType.EDR]: {
    maxRetries: 2,
    retryDelay: 2000,
    retryableStatuses: [429, 500, 503]
  },
  [PlatformType.NSM]: {
    maxRetries: 4,
    retryDelay: 1500,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  }
};

/**
 * Platform-specific cache strategies
 */
const PLATFORM_CACHE_STRATEGIES: Record<PlatformType, CacheConfig> = {
  [PlatformType.SIEM]: {
    ttl: API_CACHE_TTL.SEARCH,
    invalidation: [ApiMethod.POST, ApiMethod.PUT, ApiMethod.DELETE],
    storage: 'localStorage'
  },
  [PlatformType.EDR]: {
    ttl: API_CACHE_TTL.ANALYTICS,
    invalidation: [ApiMethod.POST, ApiMethod.PUT, ApiMethod.DELETE],
    storage: 'sessionStorage'
  },
  [PlatformType.NSM]: {
    ttl: API_CACHE_TTL.COMMUNITY,
    invalidation: [ApiMethod.POST, ApiMethod.PUT, ApiMethod.DELETE],
    storage: 'localStorage'
  }
};

/**
 * Interface for retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryableStatuses: number[];
}

/**
 * Interface for cache configuration
 */
interface CacheConfig {
  ttl: number;
  invalidation: ApiMethod[];
  storage: 'localStorage' | 'sessionStorage';
}

/**
 * Interface for platform-specific configuration
 */
interface PlatformConfig {
  timeouts: Record<PlatformType, number>;
  retryStrategies: Record<PlatformType, RetryConfig>;
  cacheStrategies: Record<PlatformType, CacheConfig>;
}

/**
 * Interface for API client configuration
 */
interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  withCredentials: boolean;
  retryConfig: RetryConfig;
  cacheConfig: CacheConfig;
  platformConfig: PlatformConfig;
}

/**
 * Default API client configuration
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: process.env.VITE_API_URL || '/api/v1',
  timeout: API_TIMEOUT.DEFAULT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
    'X-Platform-ID': getPlatformId()
  },
  retryConfig: {
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  },
  cacheConfig: {
    ttl: API_CACHE_TTL.DEFAULT,
    invalidation: [ApiMethod.POST, ApiMethod.PUT, ApiMethod.DELETE],
    storage: 'localStorage'
  },
  platformConfig: {
    timeouts: PLATFORM_SPECIFIC_TIMEOUTS,
    retryStrategies: PLATFORM_RETRY_STRATEGIES,
    cacheStrategies: PLATFORM_CACHE_STRATEGIES
  }
};

/**
 * Creates and configures an Axios instance with enhanced error handling and platform-specific settings
 */
export const createApiClient = (config: Partial<ApiRequestConfig> = {}): AxiosInstance => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const instance = axios.create(mergedConfig);

  // Request interceptor for authentication and CSRF protection
  instance.interceptors.request.use(
    (config) => {
      const token = getAuthToken();
      if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and retry logic
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config as ApiRequestConfig & { _retry?: number };
      
      if (!config || !shouldRetry(error, config, mergedConfig.retryConfig)) {
        return Promise.reject(handleApiError(error));
      }

      config._retry = (config._retry || 0) + 1;
      const delay = calculateRetryDelay(config._retry, mergedConfig.retryConfig.retryDelay);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return instance(config);
    }
  );

  // Add cache interceptor
  addCacheInterceptor(instance, mergedConfig.cacheConfig);

  return instance;
};

/**
 * Helper function to determine if a request should be retried
 */
const shouldRetry = (
  error: AxiosError,
  config: ApiRequestConfig & { _retry?: number },
  retryConfig: RetryConfig
): boolean => {
  const status = error.response?.status;
  return (
    config._retry! < retryConfig.maxRetries &&
    status !== undefined &&
    retryConfig.retryableStatuses.includes(status)
  );
};

/**
 * Calculate retry delay with exponential backoff
 */
const calculateRetryDelay = (retryCount: number, baseDelay: number): number => {
  return baseDelay * Math.pow(2, retryCount - 1);
};

/**
 * Handle API errors and convert to standardized format
 */
const handleApiError = (error: AxiosError): ApiError => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data as any;

    return createApiError(
      mapHttpStatusToErrorCode(status),
      data.message || 'An error occurred',
      {
        status,
        data: data,
        path: error.config?.url
      }
    );
  }

  return createApiError(
    ApiErrorCode.SERVICE_UNAVAILABLE,
    'Service is unavailable',
    { original: error.message }
  );
};

/**
 * Map HTTP status codes to API error codes
 */
const mapHttpStatusToErrorCode = (status: number): ApiErrorCode => {
  switch (status) {
    case 400: return ApiErrorCode.BAD_REQUEST;
    case 401: return ApiErrorCode.UNAUTHORIZED;
    case 403: return ApiErrorCode.FORBIDDEN;
    case 404: return ApiErrorCode.NOT_FOUND;
    case 409: return ApiErrorCode.CONFLICT;
    case 429: return ApiErrorCode.RATE_LIMIT_EXCEEDED;
    case 412: return ApiErrorCode.PRECONDITION_FAILED;
    case 500: return ApiErrorCode.INTERNAL_SERVER_ERROR;
    case 503: return ApiErrorCode.SERVICE_UNAVAILABLE;
    case 504: return ApiErrorCode.GATEWAY_TIMEOUT;
    default: return ApiErrorCode.INTERNAL_SERVER_ERROR;
  }
};

/**
 * Add cache interceptor to axios instance
 */
const addCacheInterceptor = (instance: AxiosInstance, cacheConfig: CacheConfig): void => {
  const storage = cacheConfig.storage === 'localStorage' ? localStorage : sessionStorage;

  instance.interceptors.request.use(
    (config) => {
      if (config.method?.toUpperCase() === 'GET') {
        const cacheKey = `api_cache_${config.url}`;
        const cachedData = storage.getItem(cacheKey);
        
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < cacheConfig.ttl * 1000) {
            return Promise.reject({
              config,
              response: { data, status: 304 }
            });
          }
        }
      }
      return config;
    }
  );

  instance.interceptors.response.use(
    (response) => {
      if (response.config.method?.toUpperCase() === 'GET') {
        const cacheKey = `api_cache_${response.config.url}`;
        storage.setItem(cacheKey, JSON.stringify({
          data: response.data,
          timestamp: Date.now()
        }));
      }
      return response;
    }
  );
};

/**
 * Helper function to get CSRF token
 */
const getCsrfToken = (): string => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
};

/**
 * Helper function to get platform ID
 */
const getPlatformId = (): string => {
  return localStorage.getItem('platformId') || '';
};

/**
 * Helper function to get auth token
 */
const getAuthToken = (): string => {
  return localStorage.getItem('authToken') || '';
};

// Export configuration and client factory
export const apiConfig = {
  baseURL: DEFAULT_CONFIG.baseURL,
  timeout: DEFAULT_CONFIG.timeout,
  headers: DEFAULT_CONFIG.headers,
  retryConfig: DEFAULT_CONFIG.retryConfig,
  cacheConfig: DEFAULT_CONFIG.cacheConfig,
  platformConfig: DEFAULT_CONFIG.platformConfig
};

export type { ApiClientConfig, RetryConfig, CacheConfig, PlatformConfig };