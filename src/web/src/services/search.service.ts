/**
 * @fileoverview Search service implementation providing optimized search functionality
 * for detection content with caching, error handling, and performance optimization.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import axios, { AxiosInstance } from 'axios'; // v1.6.0
import {
  ApiResponse,
  ApiError,
  ApiRequestConfig,
  ApiPaginationParams,
  ApiPaginatedResponse
} from '../types/api.types';
import { Detection, DetectionMetadata, DetectionSeverity } from '../types/detection.types';
import { PlatformType } from '../types/platform.types';
import { apiConfig, createApiClient } from '../config/api.config';
import { API_ENDPOINTS, API_CACHE_TTL } from '../constants/api.constants';

/**
 * Interface for search request parameters
 */
export interface SearchParams {
  query: string;
  platforms?: PlatformType[];
  tags?: string[];
  minSeverity?: DetectionSeverity;
  minConfidence?: number;
  pagination?: ApiPaginationParams;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeMetadata?: boolean;
}

/**
 * Interface for search response metadata
 */
interface SearchMetadata {
  totalResults: number;
  processingTime: number;
  cacheHit: boolean;
  queryComplexity: number;
}

/**
 * Interface for search result facets
 */
interface SearchFacets {
  platforms: Record<PlatformType, number>;
  severities: Record<DetectionSeverity, number>;
  tags: Record<string, number>;
}

/**
 * Interface for enhanced search response
 */
interface SearchResponse {
  items: Detection[];
  total: number;
  page: number;
  totalPages: number;
  metadata: SearchMetadata;
  facets: SearchFacets;
}

/**
 * Cache entry interface with timestamp
 */
interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
}

/**
 * Search service class implementing optimized search functionality
 */
export class SearchService {
  private readonly apiClient: AxiosInstance;
  private readonly cache: Map<string, CacheEntry>;
  private readonly cacheTTL: number;
  private cacheHits: number;
  private cacheMisses: number;
  private abortController: AbortController;

  /**
   * Initialize search service with configuration
   */
  constructor() {
    this.apiClient = createApiClient({
      timeout: apiConfig.timeout,
      headers: {
        ...apiConfig.headers,
        'X-Search-Client': 'web-v1.0'
      }
    });

    this.cache = new Map();
    this.cacheTTL = API_CACHE_TTL.SEARCH * 1000; // Convert to milliseconds
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.abortController = new AbortController();

    this.setupRequestInterceptors();
  }

  /**
   * Perform search with caching and optimization
   * @param params Search parameters
   * @returns Promise with paginated search results
   */
  public async search(params: SearchParams): Promise<ApiPaginatedResponse<Detection>> {
    try {
      // Cancel any pending requests
      this.abortController.abort();
      this.abortController = new AbortController();

      // Generate cache key and check cache
      const cacheKey = this.generateCacheKey(params);
      const cachedResult = this.checkCache(cacheKey);
      
      if (cachedResult) {
        this.cacheHits++;
        return this.formatResponse(cachedResult.data);
      }

      this.cacheMisses++;

      // Prepare request configuration
      const config: ApiRequestConfig = {
        headers: {},
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
        cache: true,
        signal: this.abortController.signal
      };

      // Make API request
      const response = await this.apiClient.post<ApiResponse<SearchResponse>>(
        API_ENDPOINTS.DETECTION.SEARCH,
        this.sanitizeParams(params),
        config
      );

      // Cache successful response
      this.updateCache(cacheKey, response.data.data);

      return this.formatResponse(response.data.data);
    } catch (error) {
      if (axios.isCancel(error)) {
        throw new Error('Search request cancelled');
      }
      throw this.handleSearchError(error);
    }
  }

  /**
   * Clear search cache and reset metrics
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    console.log('Search cache cleared');
  }

  /**
   * Get cache performance metrics
   */
  public getCacheMetrics(): { hits: number; misses: number; ratio: number } {
    const total = this.cacheHits + this.cacheMisses;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      ratio: total > 0 ? this.cacheHits / total : 0
    };
  }

  /**
   * Setup request interceptors for error handling
   */
  private setupRequestInterceptors(): void {
    this.apiClient.interceptors.request.use(
      (config) => {
        config.headers['X-Request-ID'] = this.generateRequestId();
        return config;
      },
      (error) => Promise.reject(error)
    );
  }

  /**
   * Check cache for valid entry
   */
  private checkCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
      return entry;
    }
    if (entry) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Update cache with new search results
   */
  private updateCache(key: string, data: SearchResponse): void {
    // Implement LRU eviction if cache size exceeds limit
    if (this.cache.size >= 100) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Generate unique cache key for search parameters
   */
  private generateCacheKey(params: SearchParams): string {
    const normalized = {
      ...params,
      platforms: params.platforms?.sort() || [],
      tags: params.tags?.sort() || [],
      pagination: {
        ...params.pagination,
        filters: this.sortObject(params.pagination?.filters || {})
      }
    };
    return btoa(JSON.stringify(normalized));
  }

  /**
   * Sanitize and validate search parameters
   */
  private sanitizeParams(params: SearchParams): SearchParams {
    return {
      query: params.query.trim(),
      platforms: params.platforms?.filter(p => Object.values(PlatformType).includes(p)),
      tags: params.tags?.map(t => t.toLowerCase()),
      minSeverity: params.minSeverity,
      minConfidence: Math.min(Math.max(params.minConfidence || 0, 0), 100),
      pagination: {
        page: Math.max(params.pagination?.page || 1, 1),
        limit: Math.min(Math.max(params.pagination?.limit || 20, 1), 100),
        ...params.pagination
      },
      sortBy: params.sortBy,
      sortOrder: params.sortOrder || 'desc',
      includeMetadata: params.includeMetadata
    };
  }

  /**
   * Format API response with enhanced metadata
   */
  private formatResponse(response: SearchResponse): ApiPaginatedResponse<Detection> {
    return {
      items: response.items,
      total: response.total,
      page: response.page,
      totalPages: response.totalPages,
      limit: response.items.length,
      hasNextPage: response.page < response.totalPages,
      hasPreviousPage: response.page > 1
    };
  }

  /**
   * Handle and transform search errors
   */
  private handleSearchError(error: any): ApiError {
    if (error.response) {
      return {
        code: error.response.status,
        message: error.response.data.message || 'Search request failed',
        details: error.response.data,
        timestamp: new Date().toISOString()
      };
    }
    return {
      code: 500,
      message: 'Internal search error',
      details: { error: error.message },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `search-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sort object keys for consistent cache keys
   */
  private sortObject(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort()
      .reduce((acc, key) => ({
        ...acc,
        [key]: obj[key]
      }), {});
  }
}

export default SearchService;