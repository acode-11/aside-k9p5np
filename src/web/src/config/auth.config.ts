/**
 * @fileoverview Frontend authentication configuration defining Auth0 settings,
 * token management, and security parameters for the AI-Powered Detection Platform.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { Auth0ClientOptions } from '@auth0/auth0-spa-js'; // v2.1.0
import { UserRole } from '../types/user.types';

/**
 * Interface for frontend authentication configuration
 */
export interface IAuthConfig {
  auth0: Auth0ClientOptions;
  token: ITokenConfig;
  security: ISecurityConfig;
}

/**
 * Interface for token management configuration
 */
export interface ITokenConfig {
  storageKey: string;
  refreshStorageKey: string;
  expiryStorageKey: string;
}

/**
 * Interface for security settings
 */
export interface ISecurityConfig {
  requireMFA: boolean;
  sessionTimeout: number;  // in seconds
  tokenRefreshThreshold: number;  // in seconds
}

/**
 * Main authentication configuration object implementing high-security standards
 * as specified in the technical requirements.
 */
export const AUTH_CONFIG: IAuthConfig = {
  auth0: {
    domain: process.env.VITE_AUTH0_DOMAIN,
    clientId: process.env.VITE_AUTH0_CLIENT_ID,
    audience: process.env.VITE_AUTH0_AUDIENCE,
    redirectUri: window.location.origin,
    useRefreshTokens: true,
    cacheLocation: 'localstorage',
    
    // Advanced security configurations
    leeway: 60, // clock skew tolerance in seconds
    advancedOptions: {
      defaultScope: 'openid profile email',
    },
    
    // Auth0 specific features
    auth0Client: {
      name: 'AI-Powered Detection Platform',
      version: '1.0.0'
    },
    
    // Additional security features
    timeoutInSeconds: 30,
    useCookiesForTransactions: true,
    
    // Role-based configuration
    scope: `openid profile email read:detections ${
      [UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN].map(role => 
        `role:${role.toLowerCase()}`
      ).join(' ')
    }`
  },
  
  // Token management configuration
  token: {
    storageKey: 'auth_token',
    refreshStorageKey: 'refresh_token',
    expiryStorageKey: 'token_expiry'
  },
  
  // Security settings aligned with enterprise requirements
  security: {
    requireMFA: true,  // Enforce MFA as per security requirements
    sessionTimeout: 3600,  // 1-hour session timeout
    tokenRefreshThreshold: 300  // Refresh token 5 minutes before expiry
  }
};

/**
 * Type guard to validate Auth0 configuration
 */
export const isValidAuth0Config = (config: Auth0ClientOptions): boolean => {
  return !!(
    config.domain &&
    config.clientId &&
    config.audience &&
    config.redirectUri
  );
};

/**
 * Helper function to check if token refresh is needed
 * @param expiryTime Token expiry timestamp
 * @returns boolean indicating if token refresh is needed
 */
export const isTokenRefreshNeeded = (expiryTime: number): boolean => {
  const currentTime = Math.floor(Date.now() / 1000);
  return (expiryTime - currentTime) <= AUTH_CONFIG.security.tokenRefreshThreshold;
};

/**
 * Helper function to clear all authentication data from storage
 */
export const clearAuthStorage = (): void => {
  localStorage.removeItem(AUTH_CONFIG.token.storageKey);
  localStorage.removeItem(AUTH_CONFIG.token.refreshStorageKey);
  localStorage.removeItem(AUTH_CONFIG.token.expiryStorageKey);
};

// Export the configuration for use across the application
export default AUTH_CONFIG;