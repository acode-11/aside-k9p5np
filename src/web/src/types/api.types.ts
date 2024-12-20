/**
 * @fileoverview TypeScript type definitions for API interfaces, responses, errors, and request types
 * used throughout the frontend application for communication with backend services.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { User } from './user.types';

/**
 * HTTP methods supported by the API
 */
export enum ApiMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

/**
 * Standardized API error codes aligned with HTTP status codes and business logic
 */
export enum ApiErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PRECONDITION_FAILED = 'PRECONDITION_FAILED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT'
}

/**
 * Generic interface for API responses with metadata support
 */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  metadata: Record<string, any>;
}

/**
 * Enhanced interface for standardized API errors with timestamps
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details: Record<string, any>;
  timestamp: string;
  requestId?: string;
  path?: string;
}

/**
 * Extended interface for API request configuration with retry and cache options
 */
export interface ApiRequestConfig {
  headers: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cache: boolean;
  signal?: AbortSignal;
  validateStatus?: (status: number) => boolean;
}

/**
 * Interface for standardized pagination parameters
 */
export interface ApiPaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  order: 'asc' | 'desc';
  search: string;
  filters: Record<string, string>;
}

/**
 * Interface for paginated API responses with metadata
 */
export interface ApiPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Default API request configuration
 */
export const DEFAULT_API_CONFIG: ApiRequestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000, // 1 second
  cache: false
};

/**
 * Default pagination parameters
 */
export const DEFAULT_PAGINATION_PARAMS: ApiPaginationParams = {
  page: 1,
  limit: 20,
  sortBy: 'createdAt',
  order: 'desc',
  search: '',
  filters: {}
};

/**
 * Type guard to check if a response is an API error
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error
  );
};

/**
 * Type guard to check if a response is paginated
 */
export const isPaginatedResponse = <T>(
  response: ApiResponse<T> | ApiPaginatedResponse<T>
): response is ApiPaginatedResponse<T> => {
  return (
    typeof response === 'object' &&
    response !== null &&
    'items' in response &&
    'total' in response &&
    'page' in response
  );
};

/**
 * Helper function to create a standardized API error
 */
export const createApiError = (
  code: ApiErrorCode,
  message: string,
  details: Record<string, any> = {}
): ApiError => {
  return {
    code,
    message,
    details,
    timestamp: new Date().toISOString()
  };
};

/**
 * Helper function to create a standardized API response
 */
export const createApiResponse = <T>(
  data: T,
  status: number = 200,
  message: string = 'Success',
  metadata: Record<string, any> = {}
): ApiResponse<T> => {
  return {
    data,
    status,
    message,
    metadata
  };
};

/**
 * Type for API response handlers
 */
export type ApiResponseHandler<T> = (response: ApiResponse<T>) => void;

/**
 * Type for API error handlers
 */
export type ApiErrorHandler = (error: ApiError) => void;

/**
 * Interface for API cache configuration
 */
export interface ApiCacheConfig {
  enabled: boolean;
  ttl: number; // Time to live in seconds
  key?: string;
  invalidateOn?: ApiMethod[];
}

/**
 * Interface for API rate limit metadata
 */
export interface ApiRateLimitMetadata {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}