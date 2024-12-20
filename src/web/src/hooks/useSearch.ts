/**
 * @fileoverview Custom React hook for managing detection search functionality with natural language
 * processing, auto-complete suggestions, filtering, and pagination capabilities.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { useState, useCallback, useEffect } from 'react'; // v18.2.0
import { useDispatch } from 'react-redux'; // v8.1.0
import debounce from 'lodash/debounce'; // v4.17.21
import { SearchService } from '../services/search.service';
import { Detection } from '../types/detection.types';
import { uiActions } from '../store/slices/uiSlice';

// Constants for search configuration
const DEBOUNCE_DELAY = 300; // 300ms delay for search debouncing
const DEFAULT_PAGE_SIZE = 20; // Default items per page
const MAX_SUGGESTIONS = 10; // Maximum number of search suggestions

// Interface for search filters
interface SearchFilters {
  platformTypes?: string[];
  tags?: string[];
  sortOrder?: 'asc' | 'desc';
  minSeverity?: string;
  minConfidence?: number;
}

// Interface for pagination state
interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Interface for search cache entry
interface CacheEntry {
  query: string;
  filters: SearchFilters;
  results: Detection[];
  timestamp: number;
}

/**
 * Custom hook for managing detection search functionality
 * @param initialFilters - Initial search filter configuration
 * @returns Search state and handlers
 */
export const useSearch = (initialFilters: SearchFilters = {}) => {
  const dispatch = useDispatch();
  const searchService = new SearchService();

  // State management
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<Detection[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0
  });
  const [cache] = useState<Map<string, CacheEntry>>(new Map());

  /**
   * Generates a cache key from search parameters
   */
  const generateCacheKey = useCallback((searchQuery: string, searchFilters: SearchFilters): string => {
    return btoa(JSON.stringify({ query: searchQuery, filters: searchFilters }));
  }, []);

  /**
   * Checks cache for existing search results
   */
  const checkCache = useCallback((key: string): CacheEntry | null => {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < 5 * 60 * 1000) { // 5 minute cache TTL
      return entry;
    }
    return null;
  }, [cache]);

  /**
   * Performs the search operation with error handling and performance optimization
   */
  const performSearch = useCallback(async (
    searchQuery: string,
    searchFilters: SearchFilters,
    page: number
  ) => {
    try {
      dispatch(uiActions.setLoading(true));
      
      const cacheKey = generateCacheKey(searchQuery, searchFilters);
      const cachedResult = checkCache(cacheKey);

      if (cachedResult) {
        setResults(cachedResult.results);
        return;
      }

      const response = await searchService.search({
        query: searchQuery,
        platforms: searchFilters.platformTypes,
        tags: searchFilters.tags,
        minSeverity: searchFilters.minSeverity,
        minConfidence: searchFilters.minConfidence,
        pagination: {
          page,
          limit: DEFAULT_PAGE_SIZE
        },
        sortOrder: searchFilters.sortOrder
      });

      setResults(response.items);
      setPagination({
        page: response.page,
        limit: DEFAULT_PAGE_SIZE,
        total: response.total,
        totalPages: response.totalPages
      });

      // Cache the results
      cache.set(cacheKey, {
        query: searchQuery,
        filters: searchFilters,
        results: response.items,
        timestamp: Date.now()
      });

    } catch (error) {
      dispatch(uiActions.showNotification({
        type: 'error',
        message: 'Failed to perform search. Please try again.',
        duration: 5000
      }));
    } finally {
      dispatch(uiActions.setLoading(false));
    }
  }, [dispatch, searchService, generateCacheKey, checkCache]);

  /**
   * Debounced search handler to prevent excessive API calls
   */
  const debouncedSearch = useCallback(
    debounce((searchQuery: string, searchFilters: SearchFilters, page: number) => {
      performSearch(searchQuery, searchFilters, page);
    }, DEBOUNCE_DELAY),
    [performSearch]
  );

  /**
   * Fetches search suggestions based on partial query
   */
  const getSuggestions = useCallback(async (partialQuery: string) => {
    if (!partialQuery || partialQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const response = await searchService.getSearchSuggestions(partialQuery);
      setSuggestions(response.slice(0, MAX_SUGGESTIONS));
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
      setSuggestions([]);
    }
  }, [searchService]);

  /**
   * Handles search query changes
   */
  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    getSuggestions(newQuery);
    debouncedSearch(newQuery, filters, 1);
  }, [filters, debouncedSearch, getSuggestions]);

  /**
   * Handles filter changes
   */
  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    performSearch(query, newFilters, 1);
  }, [query, performSearch]);

  /**
   * Handles pagination changes
   */
  const handlePageChange = useCallback((newPage: number) => {
    performSearch(query, filters, newPage);
  }, [query, filters, performSearch]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return {
    results,
    isLoading: false, // Loading state is managed through Redux
    filters,
    pagination,
    suggestions,
    handleSearch,
    handleFilterChange,
    handlePageChange
  };
};

export type { SearchFilters, PaginationState };