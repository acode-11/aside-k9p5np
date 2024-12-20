/**
 * @fileoverview Authentication utility functions for managing user authentication state,
 * token handling, and permission checks in the frontend application.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { jwtDecode } from 'jwt-decode'; // v4.0.0
import CryptoJS from 'crypto-js'; // v4.2.0
import { AUTH_CONFIG } from '../config/auth.config';
import { IUser, UserRole } from '../types/user.types';
import { ApiError } from '../types/api.types';

/**
 * Interface for decoded JWT token payload with enhanced security fields
 */
interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  permissions: string[];
  mfaVerified: boolean;
  sessionId: string;
}

/**
 * Retrieves and decrypts the stored authentication token
 * @returns The decrypted token or null if not found
 */
export const getStoredToken = (): string | null => {
  try {
    const encryptedToken = localStorage.getItem(AUTH_CONFIG.token.storageKey);
    if (!encryptedToken) return null;

    // Decrypt token using encryption key from environment
    const decryptedBytes = CryptoJS.AES.decrypt(
      encryptedToken,
      process.env.VITE_TOKEN_ENCRYPTION_KEY || ''
    );
    
    const token = decryptedBytes.toString(CryptoJS.enc.Utf8);
    if (!token) return null;

    // Validate token format
    const decoded = jwtDecode<TokenPayload>(token);
    if (!decoded.sub || !decoded.exp) return null;

    return token;
  } catch (error) {
    console.error('Error retrieving stored token:', error);
    return null;
  }
};

/**
 * Encrypts and stores the authentication token securely
 * @param token JWT token to store
 */
export const setStoredToken = (token: string): void => {
  try {
    // Validate token format
    const decoded = jwtDecode<TokenPayload>(token);
    if (!decoded.sub || !decoded.exp) {
      throw new Error('Invalid token format');
    }

    // Encrypt token before storage
    const encryptedToken = CryptoJS.AES.encrypt(
      token,
      process.env.VITE_TOKEN_ENCRYPTION_KEY || ''
    ).toString();

    // Store encrypted token and metadata
    localStorage.setItem(AUTH_CONFIG.token.storageKey, encryptedToken);
    localStorage.setItem(AUTH_CONFIG.token.expiryStorageKey, decoded.exp.toString());

    // Set up refresh timer if needed
    const timeToExpiry = decoded.exp * 1000 - Date.now();
    if (timeToExpiry > AUTH_CONFIG.security.tokenRefreshThreshold * 1000) {
      setTimeout(() => {
        refreshToken().catch(console.error);
      }, timeToExpiry - AUTH_CONFIG.security.tokenRefreshThreshold * 1000);
    }
  } catch (error) {
    console.error('Error storing token:', error);
    clearStoredToken();
  }
};

/**
 * Clears stored authentication token and related data
 */
export const clearStoredToken = (): void => {
  localStorage.removeItem(AUTH_CONFIG.token.storageKey);
  localStorage.removeItem(AUTH_CONFIG.token.refreshStorageKey);
  localStorage.removeItem(AUTH_CONFIG.token.expiryStorageKey);
};

/**
 * Validates token, checks expiration, and verifies MFA status
 * @returns Promise resolving to token validity status
 */
export const isTokenValid = async (): Promise<boolean> => {
  try {
    const token = getStoredToken();
    if (!token) return false;

    const decoded = jwtDecode<TokenPayload>(token);
    
    // Check token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (decoded.exp <= currentTime) {
      clearStoredToken();
      return false;
    }

    // Verify MFA status if required
    if (AUTH_CONFIG.security.requireMFA && !decoded.mfaVerified) {
      return false;
    }

    // Check if token needs refresh
    if (decoded.exp - currentTime <= AUTH_CONFIG.security.tokenRefreshThreshold) {
      await refreshToken();
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

/**
 * Checks user role and platform-specific permissions
 * @param user Current user object
 * @param requiredRole Minimum required role
 * @param platform Optional platform-specific check
 * @returns Boolean indicating if user has required permissions
 */
export const hasPermission = (
  user: IUser,
  requiredRole: UserRole,
  platform?: string
): boolean => {
  try {
    // Check basic role hierarchy
    const roles = Object.values(UserRole);
    const userRoleIndex = roles.indexOf(user.role);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    
    if (userRoleIndex === -1 || requiredRoleIndex === -1) {
      return false;
    }

    // Higher role index means more permissions in the enum
    const hasRequiredRole = userRoleIndex >= requiredRoleIndex;
    
    // Check platform-specific permissions if platform is provided
    if (platform && user.platformPermissions) {
      const platformPerms = user.platformPermissions[platform];
      if (!platformPerms?.canView) {
        return false;
      }
      
      // Additional checks for elevated platform permissions
      if (requiredRole === UserRole.ORGANIZATION_ADMIN && !platformPerms.canModify) {
        return false;
      }
    }

    return hasRequiredRole;
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

/**
 * Handles token refresh when approaching expiration
 * @returns Promise resolving to new valid token
 * @throws ApiError if refresh fails
 */
export const refreshToken = async (): Promise<string> => {
  try {
    const currentToken = getStoredToken();
    if (!currentToken) {
      throw new Error('No token available for refresh');
    }

    const refreshToken = localStorage.getItem(AUTH_CONFIG.token.refreshStorageKey);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // Make refresh token request to auth service
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    const { token: newToken } = await response.json();
    setStoredToken(newToken);
    return newToken;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearStoredToken();
    throw error;
  }
};