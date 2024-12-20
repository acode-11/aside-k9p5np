/**
 * @fileoverview Enhanced custom React hook for managing detection-related operations
 * with comprehensive error handling, caching, and performance optimizations.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { useCallback, useEffect, useState } from 'react'; // v18.2.0
import { useDispatch, useSelector } from 'react-redux'; // v8.1.0
import { useDebounce } from 'use-debounce'; // v9.0.0
import { useRetry } from 'use-retry'; // v2.0.0

import detectionService from '../services/detection.service';
import { Detection, ValidationResult } from '../types/detection.types';
import { PlatformType } from '../types/platform.types';
import { ApiError } from '../types/api.types';
import {
  setSelectedDetection,
  clearValidationResults,
  updateValidationMetrics,
  setPlatformConfig,
  selectDetections,
  selectSelectedDetection,
  selectValidationResults
} from '../store/slices/detectionSlice';

// Enhanced loading state interface
interface LoadingState {
  detections: boolean;
  validation: boolean;
  deployment: boolean;
  batchOperation: boolean;
}

// Enhanced error state interface
interface ErrorState {
  type: string | null;
  message: string | null;
  details: Record<string, any> | null;
  timestamp: Date | null;
}

/**
 * Enhanced custom hook for detection management with comprehensive features
 */
export const useDetection = () => {
  const dispatch = useDispatch();
  
  // Redux selectors
  const detections = useSelector(selectDetections);
  const selectedDetection = useSelector(selectSelectedDetection);
  const validationResults = useSelector(selectValidationResults);

  // Local state
  const [loading, setLoading] = useState<LoadingState>({
    detections: false,
    validation: false,
    deployment: false,
    batchOperation: false
  });
  const [error, setError] = useState<ErrorState>({
    type: null,
    message: null,
    details: null,
    timestamp: null
  });

  // Debounced search to optimize performance
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 500);

  // Retry configuration for failed operations
  const { retry } = useRetry({
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000
  });

  /**
   * Fetch detections with enhanced error handling and caching
   */
  const fetchDetections = useCallback(async (filters?: Record<string, any>) => {
    try {
      setLoading(prev => ({ ...prev, detections: true }));
      const response = await retry(() => detectionService.getDetections(filters));
      dispatch(setSelectedDetection(null));
      return response;
    } catch (error) {
      handleError(error as ApiError, 'FETCH_ERROR');
      return [];
    } finally {
      setLoading(prev => ({ ...prev, detections: false }));
    }
  }, [dispatch, retry]);

  /**
   * Fetch single detection by ID with caching
   */
  const fetchDetectionById = useCallback(async (id: string) => {
    try {
      setLoading(prev => ({ ...prev, detections: true }));
      const detection = await retry(() => detectionService.getDetectionById(id));
      dispatch(setSelectedDetection(detection));
      return detection;
    } catch (error) {
      handleError(error as ApiError, 'FETCH_SINGLE_ERROR');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, detections: false }));
    }
  }, [dispatch, retry]);

  /**
   * Create new detection with validation
   */
  const createDetection = useCallback(async (detection: Partial<Detection>) => {
    try {
      setLoading(prev => ({ ...prev, detections: true }));
      const created = await detectionService.createDetection(detection);
      await fetchDetections(); // Refresh list
      return created;
    } catch (error) {
      handleError(error as ApiError, 'CREATE_ERROR');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, detections: false }));
    }
  }, [fetchDetections]);

  /**
   * Update detection with optimistic updates
   */
  const updateDetection = useCallback(async (id: string, updates: Partial<Detection>) => {
    try {
      setLoading(prev => ({ ...prev, detections: true }));
      const updated = await detectionService.updateDetection(id, updates);
      dispatch(setSelectedDetection(updated));
      return updated;
    } catch (error) {
      handleError(error as ApiError, 'UPDATE_ERROR');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, detections: false }));
    }
  }, [dispatch]);

  /**
   * Validate detection with platform-specific rules
   */
  const validateDetection = useCallback(async (
    id: string,
    platformType: PlatformType,
    options?: { performanceCheck?: boolean; mitreMappingValidation?: boolean }
  ) => {
    try {
      setLoading(prev => ({ ...prev, validation: true }));
      const result = await detectionService.validateDetection(id, platformType, options);
      dispatch(updateValidationMetrics(result));
      return result;
    } catch (error) {
      handleError(error as ApiError, 'VALIDATION_ERROR');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, validation: false }));
    }
  }, [dispatch]);

  /**
   * Deploy detection to target platform
   */
  const deployDetection = useCallback(async (
    id: string,
    platformType: PlatformType,
    options?: { validateFirst?: boolean; notifyStakeholders?: boolean }
  ) => {
    try {
      setLoading(prev => ({ ...prev, deployment: true }));
      return await detectionService.deployDetection(id, platformType, options);
    } catch (error) {
      handleError(error as ApiError, 'DEPLOYMENT_ERROR');
      return null;
    } finally {
      setLoading(prev => ({ ...prev, deployment: false }));
    }
  }, []);

  /**
   * Batch update multiple detections
   */
  const batchUpdateDetections = useCallback(async (
    updates: Array<{ id: string; updates: Partial<Detection> }>
  ) => {
    try {
      setLoading(prev => ({ ...prev, batchOperation: true }));
      const results = await detectionService.batchUpdateDetections(updates);
      await fetchDetections(); // Refresh list
      return results;
    } catch (error) {
      handleError(error as ApiError, 'BATCH_UPDATE_ERROR');
      return [];
    } finally {
      setLoading(prev => ({ ...prev, batchOperation: false }));
    }
  }, [fetchDetections]);

  /**
   * Clear detection cache
   */
  const clearCache = useCallback(() => {
    dispatch(clearValidationResults());
  }, [dispatch]);

  /**
   * Retry failed operation
   */
  const retryOperation = useCallback(async (
    operation: () => Promise<any>,
    errorType: string
  ) => {
    try {
      return await retry(operation);
    } catch (error) {
      handleError(error as ApiError, errorType);
      return null;
    }
  }, [retry]);

  /**
   * Handle API errors with enhanced details
   */
  const handleError = (error: ApiError, type: string) => {
    setError({
      type,
      message: error.message,
      details: error.details,
      timestamp: new Date()
    });
  };

  // Cleanup subscriptions and cache on unmount
  useEffect(() => {
    return () => {
      clearCache();
    };
  }, [clearCache]);

  return {
    // State
    detections,
    selectedDetection,
    validationResults,
    loading,
    error,

    // Actions
    fetchDetections,
    fetchDetectionById,
    createDetection,
    updateDetection,
    validateDetection,
    deployDetection,
    batchUpdateDetections,
    clearCache,
    retryOperation,
    setSearchTerm
  };
};

export default useDetection;