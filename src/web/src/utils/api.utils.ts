/**
 * @fileoverview Advanced API utility functions for handling requests, responses, errors,
 * and retries with platform-specific optimizations and security enhancements.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import axios, { AxiosError } from 'axios'; // v1.6.0
import { caching } from 'cache-manager'; // v5.2.3
import {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  ApiPaginatedResponse,
  ApiErrorCode,
  createApiError
} from '../types/api.types';
import { apiConfig } from '../config/api.config';
import {
  API_TIMEOUT,
  API_RATE_LIMITS,
  API_CACHE_TTL
} from '../constants/api.constants';
import { getAuthToken, encryptToken } from './auth.utils';
import { PlatformType } from '../types/platform.types';

/**
 * Enhanced retry configuration with platform-specific settings
 */
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
  platformStrategies: Record<string, RetryStrategy>;
  enableJitter: boolean;
  shouldRetry?: (error: AxiosError) => boolean;
}

/**
 * Platform-specific retry strategy
 */
interface RetryStrategy {
  maxAttempts: number;
  baseDelayMs: number;
}

/**
 * Platform-specific cache configuration
 */
interface CacheConfig {
  ttl: number;
  maxSize: number;
}

/**
 * Default retry configuration with platform-specific optimizations
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  platformStrategies: {
    [PlatformType.SIEM]: {
      maxAttempts: 5,
      baseDelayMs: 2000
    },
    [PlatformType.EDR]: {
      maxAttempts: 4,
      baseDelayMs: 1500
    },
    [PlatformType.NSM]: {
      maxAttempts: 3,
      baseDelayMs: 1000
    }
  },
  enableJitter: true
};

/**
 * Platform-specific cache configurations
 */
const PLATFORM_CACHE_CONFIG: Record<string, CacheConfig> = {
  [PlatformType.SIEM]: {
    ttl: 300000, // 5 minutes
    maxSize: 1000
  },
  [PlatformType.EDR]: {
    ttl: 600000, // 10 minutes
    maxSize: 500
  },
  [PlatformType.NSM]: {
    ttl: 900000, // 15 minutes
    maxSize: 200
  }
};

/**
 * Enhanced error handler with platform-specific error mapping and secure logging
 * @param error - Axios error object
 * @param platformType - Type of security platform
 * @returns Standardized API error object
 */
export const handleApiError = async (
  error: AxiosError,
  platformType: string
): Promise<ApiError> => {
  const timestamp = new Date().toISOString();
  const requestId = error.config?.headers['X-Request-ID'] as string;

  // Platform-specific error mapping
  const platformError = mapPlatformError(error, platformType);

  // Encrypt sensitive error information
  const encryptedDetails = await encryptErrorDetails({
    url: error.config?.url,
    headers: error.config?.headers,
    data: error.config?.data
  });

  const apiError: ApiError = {
    code: platformError.code || ApiErrorCode.INTERNAL_SERVER_ERROR,
    message: platformError.message || 'An unexpected error occurred',
    details: {
      platformType,
      statusCode: error.response?.status,
      encryptedDetails,
      timestamp
    },
    timestamp,
    requestId
  };

  // Secure error logging with PII removal
  console.error('API Error:', {
    ...apiError,
    details: { ...apiError.details, encryptedDetails: '[REDACTED]' }
  });

  return apiError;
};

/**
 * Creates optimized API requests with caching and platform-specific configurations
 * @param config - API request configuration
 * @param platformConfig - Platform-specific configuration
 * @returns Promise resolving to API response
 */
export const createApiRequest = async <T>(
  config: ApiRequestConfig,
  platformConfig: { platformType: string; cacheConfig?: CacheConfig }
): Promise<ApiResponse<T>> => {
  const cacheKey = generateCacheKey(config);
  const cache = await initializeCache(platformConfig.cacheConfig);

  // Check cache for existing valid response
  const cachedResponse = await cache.get<ApiResponse<T>>(cacheKey);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Apply platform-specific configurations
    const enhancedConfig = await enhanceRequestConfig(config, platformConfig.platformType);
    
    // Execute request with retry capability
    const response = await retryRequest<ApiResponse<T>>(
      () => axios(enhancedConfig),
      DEFAULT_RETRY_CONFIG,
      platformConfig.platformType
    );

    // Cache successful response
    if (response.status === 200) {
      await cache.set(cacheKey, response, {
        ttl: platformConfig.cacheConfig?.ttl || API_CACHE_TTL.DEFAULT
      });
    }

    return response.data;
  } catch (error) {
    throw await handleApiError(error as AxiosError, platformConfig.platformType);
  }
};

/**
 * Advanced retry mechanism with platform-specific strategies and exponential backoff
 * @param requestFn - Function to retry
 * @param retryConfig - Retry configuration
 * @param platformType - Type of security platform
 * @returns Promise resolving to request result
 */
export const retryRequest = async <T>(
  requestFn: () => Promise<T>,
  retryConfig: RetryConfig,
  platformType: string
): Promise<T> => {
  const platformStrategy = retryConfig.platformStrategies[platformType];
  let attempt = 0;

  while (true) {
    try {
      return await requestFn();
    } catch (error) {
      attempt++;
      const maxAttempts = platformStrategy?.maxAttempts || retryConfig.maxAttempts;

      if (
        attempt >= maxAttempts ||
        !shouldRetryError(error as AxiosError, retryConfig)
      ) {
        throw error;
      }

      const delay = calculateRetryDelay(
        attempt,
        platformStrategy?.baseDelayMs || retryConfig.baseDelayMs,
        retryConfig
      );

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

/**
 * Helper function to calculate retry delay with exponential backoff and jitter
 */
const calculateRetryDelay = (
  attempt: number,
  baseDelay: number,
  config: RetryConfig
): number => {
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt - 1),
    config.maxDelayMs
  );

  if (!config.enableJitter) {
    return exponentialDelay;
  }

  // Add random jitter between 0-100ms
  return exponentialDelay + Math.random() * 100;
};

/**
 * Helper function to determine if an error should trigger a retry
 */
const shouldRetryError = (
  error: AxiosError,
  config: RetryConfig
): boolean => {
  if (config.shouldRetry) {
    return config.shouldRetry(error);
  }

  return (
    error.response !== undefined &&
    config.retryableStatuses.includes(error.response.status)
  );
};

/**
 * Helper function to enhance request configuration with platform-specific settings
 */
const enhanceRequestConfig = async (
  config: ApiRequestConfig,
  platformType: string
): Promise<ApiRequestConfig> => {
  const token = await getAuthToken();
  
  return {
    ...config,
    baseURL: apiConfig.baseURL,
    timeout: API_TIMEOUT[platformType] || API_TIMEOUT.DEFAULT,
    headers: {
      ...config.headers,
      Authorization: token ? `Bearer ${token}` : '',
      'X-Platform-Type': platformType,
      'X-Request-ID': generateRequestId()
    }
  };
};

/**
 * Helper function to generate a unique request ID
 */
const generateRequestId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Helper function to generate cache key from request config
 */
const generateCacheKey = (config: ApiRequestConfig): string => {
  return `${config.method}-${config.url}-${JSON.stringify(config.params || {})}`;
};

/**
 * Helper function to initialize cache with platform-specific settings
 */
const initializeCache = async (config?: CacheConfig) => {
  return caching('memory', {
    max: config?.maxSize || 1000,
    ttl: config?.ttl || API_CACHE_TTL.DEFAULT
  });
};

/**
 * Helper function to map platform-specific errors
 */
const mapPlatformError = (
  error: AxiosError,
  platformType: string
): Partial<ApiError> => {
  // Platform-specific error mapping logic
  const statusCode = error.response?.status;
  const platformErrors: Record<string, Record<number, ApiErrorCode>> = {
    [PlatformType.SIEM]: {
      429: ApiErrorCode.RATE_LIMIT_EXCEEDED,
      503: ApiErrorCode.SERVICE_UNAVAILABLE
    },
    [PlatformType.EDR]: {
      401: ApiErrorCode.UNAUTHORIZED,
      403: ApiErrorCode.FORBIDDEN
    },
    [PlatformType.NSM]: {
      408: ApiErrorCode.GATEWAY_TIMEOUT,
      502: ApiErrorCode.BAD_GATEWAY
    }
  };

  return {
    code: statusCode ? platformErrors[platformType]?.[statusCode] : undefined,
    message: error.response?.data?.message || error.message
  };
};

/**
 * Helper function to encrypt sensitive error details
 */
const encryptErrorDetails = async (
  details: Record<string, any>
): Promise<string> => {
  // Implementation would use proper encryption, this is a placeholder
  return Buffer.from(JSON.stringify(details)).toString('base64');
};