/// <reference types="vite/client" /> // vite ^4.0.0

/**
 * Type declarations for Vite environment variables and client types.
 * Extends the ImportMetaEnv interface to provide comprehensive type safety
 * for environment variables used throughout the application.
 */
interface ImportMetaEnv {
  /**
   * Base URL for API endpoints
   * @example 'https://api.detection-platform.com'
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * WebSocket URL for real-time updates
   * @example 'wss://ws.detection-platform.com'
   */
  readonly VITE_WS_URL: string;

  /**
   * Auth0 domain for authentication
   * @example 'detection-platform.auth0.com'
   */
  readonly VITE_AUTH0_DOMAIN: string;

  /**
   * Auth0 client ID for authentication
   * @example 'your-auth0-client-id'
   */
  readonly VITE_AUTH0_CLIENT_ID: string;

  /**
   * Auth0 audience for API authorization
   * @example 'https://api.detection-platform.com'
   */
  readonly VITE_AUTH0_AUDIENCE: string;

  /**
   * OpenAI API key for AI-powered features
   * @example 'sk-...'
   */
  readonly VITE_OPENAI_API_KEY: string;

  /**
   * Application mode (development/production)
   */
  readonly MODE: string;

  /**
   * Development mode flag
   */
  readonly DEV: boolean;

  /**
   * Production mode flag
   */
  readonly PROD: boolean;

  /**
   * Server-side rendering flag
   */
  readonly SSR: boolean;
}

/**
 * Extends ImportMeta interface to include env property with proper typing
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}