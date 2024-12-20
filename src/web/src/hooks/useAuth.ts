/**
 * @fileoverview Enhanced React hook for managing authentication state and operations,
 * implementing OAuth 2.0/OIDC integration, MFA support, secure token management,
 * and role-based access control.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { useAppDispatch, useAppSelector } from '../store';
import {
  login as loginAction,
  logout as logoutAction,
  checkAuth as checkAuthAction,
  refreshToken as refreshTokenAction
} from '../store/slices/authSlice';
import { validateMFA } from '../utils/auth.utils';
import { AUTH_CONFIG } from '../config/auth.config';

/**
 * Interface for login credentials
 */
interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Enhanced authentication hook providing comprehensive auth functionality
 * @returns Authentication state and operations
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector(state => state.auth);
  
  // Refs for managing intervals and timeouts
  const sessionTimeoutRef = useRef<NodeJS.Timeout>();
  const tokenRefreshIntervalRef = useRef<NodeJS.Timeout>();

  /**
   * Enhanced login handler with MFA support
   */
  const handleLogin = useCallback(async (credentials: LoginCredentials) => {
    try {
      // Initial login attempt
      const result = await dispatch(loginAction(credentials)).unwrap();

      // Handle MFA challenge if required
      if (result.mfaRequired && !credentials.mfaCode) {
        return { mfaRequired: true };
      }

      // Validate MFA if provided
      if (credentials.mfaCode) {
        await validateMFA(credentials.mfaCode);
      }

      // Initialize session monitoring
      initializeSessionMonitoring();
      
      return { success: true, user: result.user };
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Secure logout handler with cleanup
   */
  const handleLogout = useCallback(async () => {
    try {
      await dispatch(logoutAction()).unwrap();
      clearSessionMonitoring();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Session monitoring initialization
   */
  const initializeSessionMonitoring = useCallback(() => {
    // Clear any existing timeouts
    clearSessionMonitoring();

    // Set session timeout
    sessionTimeoutRef.current = setTimeout(() => {
      handleLogout();
    }, AUTH_CONFIG.security.sessionTimeout * 1000);

    // Set token refresh interval
    tokenRefreshIntervalRef.current = setInterval(() => {
      dispatch(refreshTokenAction());
    }, AUTH_CONFIG.security.tokenRefreshThreshold * 1000);
  }, [dispatch, handleLogout]);

  /**
   * Clear session monitoring timeouts and intervals
   */
  const clearSessionMonitoring = useCallback(() => {
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current);
    }
    if (tokenRefreshIntervalRef.current) {
      clearInterval(tokenRefreshIntervalRef.current);
    }
  }, []);

  /**
   * Check authentication status on mount and cleanup on unmount
   */
  useEffect(() => {
    dispatch(checkAuthAction());

    return () => {
      clearSessionMonitoring();
    };
  }, [dispatch, clearSessionMonitoring]);

  /**
   * Monitor for session expiration
   */
  useEffect(() => {
    if (authState.isAuthenticated) {
      initializeSessionMonitoring();
    }

    return () => {
      clearSessionMonitoring();
    };
  }, [authState.isAuthenticated, initializeSessionMonitoring, clearSessionMonitoring]);

  /**
   * Handle token refresh before expiration
   */
  useEffect(() => {
    const handleTokenRefresh = async () => {
      if (authState.isAuthenticated && authState.tokenRefreshTime) {
        const timeUntilRefresh = authState.tokenRefreshTime - Date.now();
        if (timeUntilRefresh <= AUTH_CONFIG.security.tokenRefreshThreshold * 1000) {
          await dispatch(refreshTokenAction());
        }
      }
    };

    handleTokenRefresh();
  }, [authState.isAuthenticated, authState.tokenRefreshTime, dispatch]);

  return {
    // Authentication state
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    error: authState.error,
    mfaRequired: authState.mfaStatus === 'required',
    sessionExpiring: authState.lastActivity + authState.sessionTimeout <= Date.now(),

    // Authentication operations
    login: handleLogin,
    logout: handleLogout,
    checkAuth: () => dispatch(checkAuthAction()),
    validateMFA: async (code: string) => {
      await validateMFA(code);
      initializeSessionMonitoring();
    },
    refreshSession: () => {
      dispatch(refreshTokenAction());
      initializeSessionMonitoring();
    }
  };
};

export default useAuth;