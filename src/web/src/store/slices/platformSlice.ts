/**
 * @fileoverview Redux Toolkit slice for managing security platform state including configurations,
 * selected platforms, deployment status, validation states, and platform compatibility.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { createSlice, createAsyncThunk, PayloadAction, createSelector } from '@reduxjs/toolkit'; // v1.9.7
import {
  IPlatform,
  PlatformType,
  PlatformValidationStatus,
  PlatformCompatibility
} from '../../types/platform.types';
import PlatformService from '../../services/platform.service';
import {
  validatePlatformConfig,
  formatPlatformError,
  checkPlatformCompatibility
} from '../../utils/platform.utils';

// Interface for deployment metadata
interface DeploymentMetadata {
  timestamp: string;
  user: string;
  version: string;
  validationResults: Record<string, any>;
}

// Interface for platform state
interface PlatformState {
  platforms: IPlatform[];
  selectedPlatform: string | null;
  loading: boolean;
  error: string | null;
  deploymentStatus: Record<string, {
    success: boolean;
    message: string;
    metadata: DeploymentMetadata;
  }>;
  validationStates: Record<string, PlatformValidationStatus>;
  compatibility: Record<string, PlatformCompatibility>;
  lastUpdated: string | null;
}

// Initial state
const initialState: PlatformState = {
  platforms: [],
  selectedPlatform: null,
  loading: false,
  error: null,
  deploymentStatus: {},
  validationStates: {},
  compatibility: {},
  lastUpdated: null
};

// Create platform service instance
const platformService = new PlatformService();

/**
 * Async thunk for fetching supported platforms with validation
 */
export const fetchPlatforms = createAsyncThunk(
  'platform/fetchPlatforms',
  async (_, { rejectWithValue }) => {
    try {
      const platforms = await platformService.getPlatforms();
      
      // Validate each platform configuration
      const validatedPlatforms = await Promise.all(
        platforms.map(async (platform) => {
          const validation = await platformService.validatePlatform(platform);
          if (!validation.valid) {
            console.warn(`Platform validation failed: ${platform.id}`, validation.errors);
          }
          return platform;
        })
      );

      return validatedPlatforms.filter((p): p is IPlatform => p !== null);
    } catch (error) {
      return rejectWithValue(formatPlatformError(error as Error, PlatformType.SIEM));
    }
  }
);

/**
 * Platform slice with enhanced state management
 */
const platformSlice = createSlice({
  name: 'platform',
  initialState,
  reducers: {
    selectPlatform(state, action: PayloadAction<string>) {
      state.selectedPlatform = action.payload;
      state.error = null;
    },
    updateDeploymentStatus(
      state,
      action: PayloadAction<Record<string, { success: boolean; message: string; metadata: DeploymentMetadata }>>
    ) {
      state.deploymentStatus = {
        ...state.deploymentStatus,
        ...action.payload
      };
      state.lastUpdated = new Date().toISOString();
    },
    updateValidationState(
      state,
      action: PayloadAction<{ platformId: string; status: PlatformValidationStatus }>
    ) {
      state.validationStates[action.payload.platformId] = action.payload.status;
    },
    updateCompatibility(
      state,
      action: PayloadAction<{ platformId: string; compatibility: PlatformCompatibility }>
    ) {
      state.compatibility[action.payload.platformId] = action.payload.compatibility;
    },
    clearError(state) {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatforms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlatforms.fulfilled, (state, action) => {
        state.platforms = action.payload;
        state.loading = false;
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchPlatforms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ? 
          (action.payload as { message: string }).message :
          'Failed to fetch platforms';
      });
  }
});

// Selectors with memoization
export const selectAllPlatforms = (state: { platform: PlatformState }) => state.platform.platforms;
export const selectSelectedPlatform = (state: { platform: PlatformState }) => state.platform.selectedPlatform;
export const selectPlatformLoading = (state: { platform: PlatformState }) => state.platform.loading;
export const selectPlatformError = (state: { platform: PlatformState }) => state.platform.error;

export const selectPlatformById = createSelector(
  [selectAllPlatforms, (_, platformId: string) => platformId],
  (platforms, platformId) => platforms.find(p => p.id === platformId)
);

export const selectPlatformValidation = createSelector(
  [(state: { platform: PlatformState }) => state.platform.validationStates, (_, platformId: string) => platformId],
  (validationStates, platformId) => validationStates[platformId]
);

export const selectPlatformCompatibility = createSelector(
  [(state: { platform: PlatformState }) => state.platform.compatibility, (_, platformId: string) => platformId],
  (compatibility, platformId) => compatibility[platformId]
);

// Export actions and reducer
export const {
  selectPlatform,
  updateDeploymentStatus,
  updateValidationState,
  updateCompatibility,
  clearError
} = platformSlice.actions;

export default platformSlice.reducer;