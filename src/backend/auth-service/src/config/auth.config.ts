import { config } from 'dotenv'; // v16.3.1
import { Algorithm } from 'jsonwebtoken'; // v9.0.2

// Load environment variables
config();

// Global environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Interface definitions
interface SecurityConfig {
  passwordMinLength: number;
  passwordMaxLength: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireMFA: boolean;
  rateLimit: number;
  rateLimitWindow: number;
  allowedOrigins: string[];
  enableAuditLog: boolean;
}

interface JWTConfig {
  algorithm: Algorithm;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  privateKeyPath: string;
  publicKeyPath: string;
  keyRotationInterval: number;
  enableBlacklist: boolean;
}

interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scopes: string[];
  userInfoEndpoint: string;
  enableStateValidation: boolean;
}

interface MFAConfig {
  issuer: string;
  algorithm: string;
  digits: number;
  step: number;
  window: number;
  enforceForAdmins: boolean;
  allowedMethods: string[];
  backupCodeCount: number;
}

interface ComplianceConfig {
  gdprEnabled: boolean;
  dataRetentionDays: number;
  privacyPolicyUrl: string;
  requiredConsents: string[];
  enableDataExport: boolean;
}

// Main configuration object
export const AUTH_CONFIG = {
  security: {
    passwordMinLength: 12,
    passwordMaxLength: 128,
    maxLoginAttempts: 5,
    lockoutDuration: 900, // 15 minutes in seconds
    sessionTimeout: 3600, // 1 hour in seconds
    requireMFA: true,
    rateLimit: 100, // requests per window
    rateLimitWindow: 60, // window in seconds
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [],
    enableAuditLog: true
  } as SecurityConfig,

  jwt: {
    algorithm: 'RS256' as Algorithm,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    issuer: 'ai-detection-platform',
    audience: 'detection-platform-users',
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH,
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH,
    keyRotationInterval: 30 * 24 * 60 * 60, // 30 days in seconds
    enableBlacklist: true
  } as JWTConfig,

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
      scopes: ['email', 'profile', 'openid'],
      userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
      enableStateValidation: true
    } as OAuthProviderConfig,

    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL,
      scopes: ['user:email', 'read:user'],
      userInfoEndpoint: 'https://api.github.com/user',
      enableStateValidation: true
    } as OAuthProviderConfig
  },

  mfa: {
    issuer: 'AI Detection Platform',
    algorithm: 'SHA1',
    digits: 6,
    step: 30, // TOTP step size in seconds
    window: 1, // Number of steps to check before/after current time
    enforceForAdmins: true,
    allowedMethods: ['TOTP', 'SMS', 'EMAIL'],
    backupCodeCount: 10
  } as MFAConfig,

  compliance: {
    gdprEnabled: true,
    dataRetentionDays: 90,
    privacyPolicyUrl: process.env.PRIVACY_POLICY_URL,
    requiredConsents: ['terms', 'privacy', 'data_processing'],
    enableDataExport: true
  } as ComplianceConfig
};

// Type assertion for the entire config object
export type AuthConfig = typeof AUTH_CONFIG;