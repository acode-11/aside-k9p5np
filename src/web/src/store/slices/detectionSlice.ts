/**
 * @fileoverview Redux Toolkit slice for managing detection state with enhanced validation,
 * platform-specific features, and comprehensive state management.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.7
import { 
  Detection, 
  ValidationResult, 
  DetectionMetadata,
  DetectionSeverity,
  PerformanceImpact
} from '../../types/detection.types';
import DetectionService from '../../services/detection.service';
import { PlatformType } from '../../types/platform.types';
import { ApiPaginationParams, ApiError } from '../../types/api.types';

// State interface with enhanced validation support
interface DetectionState {
  detections: Detection[];
  selectedDetection: Detection | null;
  validationResults: {
    current: ValidationResult | null;
    history: ValidationResult[];
    metrics: {
      accuracy: number;
      performance: number;
      coverage: number;
    };
  };
  platformConfig: {
    validationRules: Record<PlatformType, any>;
    optimizationSettings: Record<PlatformType, any>;
  };
  loading: {
    detections: boolean;
    validation: boolean;
    deployment: boolean;
  };
  error: {
    type: string | null;
    message: string | null;
    details: Record<string, any> | null;
  };
}

// Initial state with comprehensive structure
const initialState: DetectionState = {
  detections: [],
  selectedDetection: null,
  validationResults: {
    current: null,
    history: [],
    metrics: {
      accuracy: 0,
      performance: 0,
      coverage: 0
    }
  },
  platformConfig: {
    validationRules: {},
    optimizationSettings: {}
  },
  loading: {
    detections: false,
    validation: false,
    deployment: false
  },
  error: {
    type: null,
    message: null,
    details: null
  }
};

// Enhanced async thunk for fetching detections with validation status
export const fetchDetections = createAsyncThunk(
  'detection/fetchDetections',
  async (params: { pagination: ApiPaginationParams; validationFilter?: string }, { rejectWithValue }) => {
    try {
      const detectionService = new DetectionService({} as any);
      const response = await detectionService.getDetection(params.pagination.toString());
      return response;
    } catch (error) {
      return rejectWithValue((error as ApiError).message);
    }
  }
);

// Enhanced async thunk for comprehensive detection validation
export const validateDetection = createAsyncThunk(
  'detection/validateDetection',
  async (
    params: { 
      detectionId: string; 
      platformType: PlatformType;
      options?: {
        performanceCheck?: boolean;
        mitreMappingValidation?: boolean;
        platformSpecificRules?: boolean;
      }
    },
    { rejectWithValue }
  ) => {
    try {
      const detectionService = new DetectionService({} as any);
      const result = await detectionService.validateDetection(
        params.detectionId,
        params.platformType,
        params.options
      );
      return result;
    } catch (error) {
      return rejectWithValue((error as ApiError).message);
    }
  }
);

// Enhanced async thunk for batch validation operations
export const validateBatch = createAsyncThunk(
  'detection/validateBatch',
  async (
    params: { 
      detectionIds: string[]; 
      platformType: PlatformType 
    },
    { rejectWithValue }
  ) => {
    try {
      const detectionService = new DetectionService({} as any);
      const results = await Promise.all(
        params.detectionIds.map(id => 
          detectionService.validateDetection(id, params.platformType)
        )
      );
      return results;
    } catch (error) {
      return rejectWithValue((error as ApiError).message);
    }
  }
);

// Detection slice with enhanced features
const detectionSlice = createSlice({
  name: 'detection',
  initialState,
  reducers: {
    setSelectedDetection: (state, action: PayloadAction<Detection | null>) => {
      state.selectedDetection = action.payload;
    },
    clearValidationResults: (state) => {
      state.validationResults.current = null;
      state.validationResults.history = [];
    },
    updateValidationMetrics: (state, action: PayloadAction<ValidationResult>) => {
      const { falsePositiveRate, performanceImpact, resourceUsage } = action.payload;
      state.validationResults.metrics = {
        accuracy: 100 - falsePositiveRate,
        performance: performanceImpact === PerformanceImpact.LOW ? 100 : 
          performanceImpact === PerformanceImpact.MEDIUM ? 70 : 40,
        coverage: resourceUsage.resourceScore
      };
    },
    setPlatformConfig: (state, action: PayloadAction<{
      platform: PlatformType;
      config: { validationRules: any; optimizationSettings: any; }
    }>) => {
      const { platform, config } = action.payload;
      state.platformConfig.validationRules[platform] = config.validationRules;
      state.platformConfig.optimizationSettings[platform] = config.optimizationSettings;
    }
  },
  extraReducers: (builder) => {
    // Fetch detections handlers
    builder.addCase(fetchDetections.pending, (state) => {
      state.loading.detections = true;
      state.error = { type: null, message: null, details: null };
    });
    builder.addCase(fetchDetections.fulfilled, (state, action) => {
      state.detections = action.payload;
      state.loading.detections = false;
    });
    builder.addCase(fetchDetections.rejected, (state, action) => {
      state.loading.detections = false;
      state.error = {
        type: 'FETCH_ERROR',
        message: action.payload as string,
        details: null
      };
    });

    // Validation handlers
    builder.addCase(validateDetection.pending, (state) => {
      state.loading.validation = true;
    });
    builder.addCase(validateDetection.fulfilled, (state, action) => {
      state.validationResults.current = action.payload;
      state.validationResults.history.push(action.payload);
      state.loading.validation = false;
    });
    builder.addCase(validateDetection.rejected, (state, action) => {
      state.loading.validation = false;
      state.error = {
        type: 'VALIDATION_ERROR',
        message: action.payload as string,
        details: null
      };
    });

    // Batch validation handlers
    builder.addCase(validateBatch.pending, (state) => {
      state.loading.validation = true;
    });
    builder.addCase(validateBatch.fulfilled, (state, action) => {
      state.validationResults.history.push(...action.payload);
      state.loading.validation = false;
    });
    builder.addCase(validateBatch.rejected, (state, action) => {
      state.loading.validation = false;
      state.error = {
        type: 'BATCH_VALIDATION_ERROR',
        message: action.payload as string,
        details: null
      };
    });
  }
});

// Export actions and reducer
export const {
  setSelectedDetection,
  clearValidationResults,
  updateValidationMetrics,
  setPlatformConfig
} = detectionSlice.actions;

export default detectionSlice.reducer;

// Selectors with memoization potential
export const selectDetections = (state: { detection: DetectionState }) => state.detection.detections;
export const selectSelectedDetection = (state: { detection: DetectionState }) => state.detection.selectedDetection;
export const selectValidationResults = (state: { detection: DetectionState }) => state.detection.validationResults;
export const selectValidationMetrics = (state: { detection: DetectionState }) => state.detection.validationResults.metrics;
export const selectPlatformConfig = (state: { detection: DetectionState }) => state.detection.platformConfig;