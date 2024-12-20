/**
 * @fileoverview Enhanced authentication service implementing secure Auth0 integration,
 * MFA enforcement, and token management for the AI-Powered Detection Platform.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { Auth0Client, createAuth0Client, GetTokenSilentlyOptions } from '@auth0/auth0-spa-js'; // v2.1.0
import { RateLimiter } from 'limiter'; // v2.0.0
import { AUTH_CONFIG } from '../config/auth.config';
import { IUser } from '../types/user.types';

/**
 * Custom error types for authentication failures
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class MFARequiredError extends AuthenticationError {
  constructor() {
    super('Multi-factor authentication is required');
    this.name = 'MFARequiredError';
  }
}

/**
 * Enhanced authentication service class implementing secure Auth0 integration
 * with MFA enforcement and comprehensive token management.
 */
export class AuthService {
  private auth0Client: Auth0Client | null = null;
  private currentUser: IUser | null = null;
  private isAuthenticated: boolean = false;
  private sessionTimeout: number;
  private tokenRefreshThreshold: number;
  private sessionTimeoutId?: NodeJS.Timeout;
  private tokenRefreshIntervalId?: NodeJS.Timeout;
  private rateLimiter: RateLimiter;

  constructor() {
    this.sessionTimeout = AUTH_CONFIG.security.sessionTimeout;
    this.tokenRefreshThreshold = AUTH_CONFIG.security.tokenRefreshThreshold;
    this.rateLimiter = new RateLimiter({
      tokensPerInterval: 5,
      interval: 'minute',
      fireImmediately: true
    });
  }

  /**
   * Initializes the Auth0 client and validates authentication state
   */
  public async initialize(): Promise<void> {
    try {
      this.auth0Client = await createAuth0Client({
        ...AUTH_CONFIG.auth0,
        cacheLocation: 'localstorage',
        useRefreshTokens: true
      });

      // Handle redirect callback if applicable
      if (window.location.search.includes('code=')) {
        const { appState } = await this.auth0Client.handleRedirectCallback();
        // Restore application state if needed
        if (appState?.returnTo) {
          window.location.replace(appState.returnTo);
        }
      }

      // Check authentication state
      this.isAuthenticated = await this.auth0Client.isAuthenticated();

      if (this.isAuthenticated) {
        await this.loadUserProfile();
        this.setupSessionTimeout();
        this.setupTokenRefresh();
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      throw new AuthenticationError('Failed to initialize authentication');
    }
  }

  /**
   * Initiates the login process with MFA enforcement
   */
  public async login(): Promise<void> {
    try {
      if (!this.auth0Client) {
        throw new AuthenticationError('Auth0 client not initialized');
      }

      // Check rate limiting
      if (!await this.rateLimiter.removeTokens(1)) {
        throw new AuthenticationError('Too many login attempts. Please try again later.');
      }

      await this.auth0Client.loginWithRedirect({
        appState: {
          returnTo: window.location.pathname
        },
        authorizationParams: {
          prompt: AUTH_CONFIG.security.requireMFA ? 'login mfa' : 'login'
        }
      });
    } catch (error) {
      console.error('Login failed:', error);
      throw new AuthenticationError('Failed to initiate login process');
    }
  }

  /**
   * Logs out the current user and cleans up session data
   */
  public async logout(): Promise<void> {
    try {
      if (!this.auth0Client) {
        throw new AuthenticationError('Auth0 client not initialized');
      }

      this.clearSession();
      await this.auth0Client.logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } catch (error) {
      console.error('Logout failed:', error);
      throw new AuthenticationError('Failed to complete logout process');
    }
  }

  /**
   * Retrieves the current user profile
   */
  public async getUser(): Promise<IUser | null> {
    return this.currentUser;
  }

  /**
   * Retrieves a valid access token
   */
  public async getAccessToken(options: GetTokenSilentlyOptions = {}): Promise<string | null> {
    try {
      if (!this.auth0Client || !this.isAuthenticated) {
        return null;
      }

      return await this.auth0Client.getTokenSilently({
        ...options,
        timeoutInSeconds: 60,
        cacheMode: 'on'
      });
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Validates MFA status and enforces MFA requirements
   */
  public async validateMFA(user: IUser): Promise<boolean> {
    if (!AUTH_CONFIG.security.requireMFA) {
      return true;
    }

    try {
      const mfaStatus = await this.auth0Client?.getChallenge();
      if (!mfaStatus?.complete) {
        throw new MFARequiredError();
      }
      return true;
    } catch (error) {
      console.error('MFA validation failed:', error);
      throw new MFARequiredError();
    }
  }

  /**
   * Loads and validates the user profile
   */
  private async loadUserProfile(): Promise<void> {
    try {
      if (!this.auth0Client) {
        throw new AuthenticationError('Auth0 client not initialized');
      }

      const user = await this.auth0Client.getUser();
      if (!user) {
        throw new AuthenticationError('Failed to load user profile');
      }

      // Transform Auth0 user to application user model
      this.currentUser = {
        id: user.sub!,
        email: user.email!,
        firstName: user.given_name!,
        lastName: user.family_name!,
        role: user['https://detection-platform/role'],
        organizationId: user['https://detection-platform/org_id'],
        teamIds: user['https://detection-platform/team_ids'] || [],
        platformPermissions: user['https://detection-platform/permissions'] || {},
        preferences: user['https://detection-platform/preferences'] || {},
        createdAt: new Date(user.created_at!),
        lastLoginAt: new Date()
      };

      // Validate MFA if required
      if (AUTH_CONFIG.security.requireMFA) {
        await this.validateMFA(this.currentUser);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      throw new AuthenticationError('Failed to load user profile');
    }
  }

  /**
   * Sets up session timeout monitoring
   */
  private setupSessionTimeout(): void {
    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
    }

    this.sessionTimeoutId = setTimeout(() => {
      this.logout();
    }, this.sessionTimeout * 1000);
  }

  /**
   * Sets up token refresh monitoring
   */
  private setupTokenRefresh(): void {
    if (this.tokenRefreshIntervalId) {
      clearInterval(this.tokenRefreshIntervalId);
    }

    this.tokenRefreshIntervalId = setInterval(async () => {
      try {
        await this.getAccessToken({ skipCache: true });
      } catch (error) {
        console.error('Token refresh failed:', error);
        await this.logout();
      }
    }, this.tokenRefreshThreshold * 1000);
  }

  /**
   * Cleans up session data and intervals
   */
  private clearSession(): void {
    this.currentUser = null;
    this.isAuthenticated = false;

    if (this.sessionTimeoutId) {
      clearTimeout(this.sessionTimeoutId);
    }

    if (this.tokenRefreshIntervalId) {
      clearInterval(this.tokenRefreshIntervalId);
    }

    // Clear local storage items
    Object.values(AUTH_CONFIG.token).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// Export singleton instance
export const authService = new AuthService();