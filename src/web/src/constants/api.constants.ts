/**
 * API Constants
 * @description Defines API-related constants including endpoint URLs, timeouts, rate limits, and cache TTL values
 * @version 1.0.0
 */

/**
 * Base API version path
 * @constant
 */
export const API_VERSION = '/api/v1' as const;

/**
 * Type-safe API endpoint definitions
 * @constant
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    REGISTER: '/auth/register'
  },
  DETECTION: {
    BASE: '/detections',
    SEARCH: '/detections/search',
    VALIDATE: '/detections/validate',
    DEPLOY: '/detections/deploy'
  },
  PLATFORM: {
    LIST: '/platforms',
    CONNECT: '/platforms/connect',
    STATUS: '/platforms/status'
  },
  COMMUNITY: {
    LIST: '/communities',
    DISCUSSIONS: '/communities/discussions',
    MEMBERS: '/communities/members'
  },
  ANALYTICS: {
    DASHBOARD: '/analytics/dashboard',
    METRICS: '/analytics/metrics',
    REPORTS: '/analytics/reports'
  }
} as const;

/**
 * API timeout configurations in milliseconds
 * @constant
 */
export const API_TIMEOUT = {
  DEFAULT: 30000, // 30 seconds
  LONG: 60000,    // 1 minute
  UPLOAD: 120000  // 2 minutes
} as const;

/**
 * API rate limits (requests per hour)
 * @constant
 */
export const API_RATE_LIMITS = {
  PUBLIC_SEARCH: 1000,   // Public search endpoints
  DETECTION_CRUD: 500,   // Detection management operations
  PLATFORM_DEPLOY: 100,  // Platform deployment operations
  ANALYTICS: 200,        // Analytics data retrieval
  COMMUNITY: 300         // Community interactions
} as const;

/**
 * API cache TTL values in seconds
 * @constant
 */
export const API_CACHE_TTL = {
  SEARCH: 300,     // 5 minutes for search results
  ANALYTICS: 900,  // 15 minutes for analytics data
  COMMUNITY: 600   // 10 minutes for community content
} as const;

/**
 * Type definitions for API constants
 */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Record<string, any>
    ? DeepReadonly<T[P]>
    : T[P];
};

export type ApiEndpoints = DeepReadonly<typeof API_ENDPOINTS>;
export type ApiTimeout = DeepReadonly<typeof API_TIMEOUT>;
export type ApiRateLimits = DeepReadonly<typeof API_RATE_LIMITS>;
export type ApiCacheTtl = DeepReadonly<typeof API_CACHE_TTL>;

/**
 * Helper function to construct full API URLs
 * @param endpoint - The API endpoint path
 * @returns The complete API URL
 */
export const getApiUrl = (endpoint: string): string => {
  return `${API_VERSION}${endpoint}`;
};