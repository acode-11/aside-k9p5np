/**
 * @fileoverview Enhanced Redux Toolkit slice for authentication state management
 * implementing secure session handling, MFA validation, and token refresh logic.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // v1.9.7
import { IUser } from '../../types/user.types';
import { AuthService, authService, AuthenticationError, MFARequiredError } from '../../services/auth.service';

/**
 * MFA validation status enum
 */
export enum MFAStatus {
  NONE = 'none',
  REQUIRED = 'required',
  PENDING = 'pending',
  VALIDATED = 'validated'
}

/**
 * Authentication error interface
 */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Login credentials interface
 */
interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Enhanced authentication state interface
 */
interface IAuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
  mfaStatus: MFAStatus;
  lastActivity: number;
  sessionTimeout: number;
  tokenRefreshTime: number;
}

/**
 * Initial authentication state
 */
const initialState: IAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  mfaStatus: MFAStatus.NONE,
  lastActivity: Date.now(),
  sessionTimeout: 3600000, // 1 hour in milliseconds
  tokenRefreshTime: 0
};

/**
 * Enhanced async thunk for user login with MFA support
 */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      await authService.login();
      const user = await authService.getUser();
      
      if (!user) {
        throw new AuthenticationError('Login failed: User data not available');
      }

      // Validate MFA if required
      if (credentials.mfaCode) {
        await authService.validateMFA(user);
      }

      return user;
    } catch (error) {
      if (error instanceof MFARequiredError) {
        return rejectWithValue({
          code: 'MFA_REQUIRED',
          message: error.message
        });
      }
      return rejectWithValue({
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }
);

/**
 * Enhanced async thunk for user logout
 */
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
    } catch (error) {
      return rejectWithValue({
        code: 'LOGOUT_FAILED',
        message: error instanceof Error ? error.message : 'Logout failed'
      });
    }
  }
);

/**
 * Enhanced async thunk for checking authentication status
 */
export const checkAuthStatus = createAsyncThunk(
  'auth/checkStatus',
  async (_, { getState, rejectWithValue }) => {
    try {
      const user = await authService.getUser();
      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      return rejectWithValue({
        code: 'AUTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Auth check failed'
      });
    }
  }
);

/**
 * Enhanced authentication slice with comprehensive state management
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateLastActivity: (state) => {
      state.lastActivity = Date.now();
    },
    setMFAStatus: (state, action: PayloadAction<MFAStatus>) => {
      state.mfaStatus = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    updateTokenRefreshTime: (state) => {
      state.tokenRefreshTime = Date.now();
    }
  },
  extraReducers: (builder) => {
    builder
      // Login cases
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.lastActivity = Date.now();
        state.mfaStatus = MFAStatus.VALIDATED;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as AuthError;
        if (action.payload && (action.payload as AuthError).code === 'MFA_REQUIRED') {
          state.mfaStatus = MFAStatus.REQUIRED;
        }
      })
      // Logout cases
      .addCase(logoutUser.fulfilled, (state) => {
        return { ...initialState };
      })
      // Check auth status cases
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = !!action.payload;
        state.lastActivity = Date.now();
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
      });
  }
});

// Export actions
export const {
  updateLastActivity,
  setMFAStatus,
  clearError,
  updateTokenRefreshTime
} = authSlice.actions;

// Export selectors
export const selectUser = (state: { auth: IAuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: IAuthState }) => state.auth.isAuthenticated;
export const selectMFAStatus = (state: { auth: IAuthState }) => state.auth.mfaStatus;
export const selectAuthError = (state: { auth: IAuthState }) => state.auth.error;
export const selectSessionValidity = (state: { auth: IAuthState }) => {
  const { lastActivity, sessionTimeout } = state.auth;
  return Date.now() - lastActivity < sessionTimeout;
};

// Export reducer
export default authSlice.reducer;