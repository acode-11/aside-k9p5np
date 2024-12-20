/**
 * @fileoverview Platform type definitions and interfaces for security platform configurations,
 * capabilities, and integration settings.
 * @version 1.0.0
 * @package @detection-platform/web
 */

// @ts-ignore Import zod for runtime type validation
import { z } from 'zod'; // v3.22.4

/**
 * Supported security platform types
 */
export enum PlatformType {
  SIEM = 'SIEM',
  EDR = 'EDR',
  NSM = 'NSM'
}

/**
 * Authentication methods supported by security platforms
 */
export enum PlatformAuthType {
  OAuth2 = 'OAuth2',
  APIKey = 'APIKey',
  Token = 'Token'
}

/**
 * Platform synchronization methods for detection content
 */
export enum PlatformSyncMethod {
  Push = 'Push',
  Pull = 'Pull',
  PushPull = 'PushPull'
}

/**
 * Platform-specific parameter interface for capability configuration
 */
export interface IPlatformParameter {
  name: string;
  description: string;
  type: string;
  defaultValue?: unknown;
  required: boolean;
  validation?: RegExp | ((value: unknown) => boolean);
}

/**
 * Platform capability interface defining supported detection features
 */
export interface IPlatformCapability {
  name: string;
  description: string;
  parameters: IPlatformParameter[];
  constraints: Record<string, any>;
  isRequired: boolean;
  version: string;
}

/**
 * Platform-specific validation rules and constraints
 */
export interface IPlatformValidation {
  rules: string[];
  maxSize: number;
  syntaxPatterns: RegExp[];
  requiredFields: string[];
  customValidators: ((value: unknown) => boolean)[];
}

/**
 * Platform API configuration including auth, rate limits, and endpoints
 */
export interface IPlatformAPIConfig {
  authType: PlatformAuthType;
  rateLimits: {
    requests: number;
    period: string;
    retryAfter?: number;
  };
  endpoints: Record<string, string>;
  syncMethod: PlatformSyncMethod;
  timeout: number;
  retryConfig: {
    maxRetries: number;
    backoffFactor: number;
  };
}

/**
 * Comprehensive platform configuration interface
 */
export interface IPlatform {
  id: string;
  name: string;
  type: PlatformType;
  version: string;
  capabilities: IPlatformCapability[];
  validationRules: IPlatformValidation;
  apiConfig: IPlatformAPIConfig;
  supportedFormats: string[];
  metadata: Record<string, unknown>;
}

/**
 * Global constants for platform configuration
 */
export const PLATFORM_TYPES: readonly PlatformType[] = [
  PlatformType.SIEM,
  PlatformType.EDR,
  PlatformType.NSM
] as const;

/**
 * Default rate limits per platform type (requests per hour)
 */
export const DEFAULT_RATE_LIMITS: Record<PlatformType, number> = {
  [PlatformType.SIEM]: 1000,
  [PlatformType.EDR]: 750,
  [PlatformType.NSM]: 500
};

/**
 * Version pattern validation per platform type
 */
export const PLATFORM_VERSION_PATTERNS: Record<PlatformType, string> = {
  [PlatformType.SIEM]: '^\\d+\\.\\d+\\.\\d+$', // e.g., 8.2.1
  [PlatformType.EDR]: '^v\\d+\\.\\d+$',        // e.g., v6.5
  [PlatformType.NSM]: '^\\d{1,2}\\.\\d{1,2}$'  // e.g., 4.2
};

/**
 * Zod schema for runtime platform configuration validation
 */
export const platformSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.nativeEnum(PlatformType),
  version: z.string().regex(new RegExp(PLATFORM_VERSION_PATTERNS[PlatformType.SIEM])),
  capabilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    parameters: z.array(z.object({
      name: z.string(),
      description: z.string(),
      type: z.string(),
      required: z.boolean(),
      defaultValue: z.unknown().optional()
    })),
    constraints: z.record(z.unknown()),
    isRequired: z.boolean(),
    version: z.string()
  })),
  validationRules: z.object({
    rules: z.array(z.string()),
    maxSize: z.number().positive(),
    syntaxPatterns: z.array(z.instanceof(RegExp)),
    requiredFields: z.array(z.string()),
    customValidators: z.array(z.function().returns(z.boolean()))
  }),
  apiConfig: z.object({
    authType: z.nativeEnum(PlatformAuthType),
    rateLimits: z.object({
      requests: z.number().positive(),
      period: z.string(),
      retryAfter: z.number().optional()
    }),
    endpoints: z.record(z.string()),
    syncMethod: z.nativeEnum(PlatformSyncMethod),
    timeout: z.number().positive(),
    retryConfig: z.object({
      maxRetries: z.number().min(0),
      backoffFactor: z.number().positive()
    })
  }),
  supportedFormats: z.array(z.string()),
  metadata: z.record(z.unknown())
});

/**
 * Type guard to check if a value is a valid PlatformType
 */
export const isPlatformType = (value: unknown): value is PlatformType => {
  return Object.values(PlatformType).includes(value as PlatformType);
};

/**
 * Type guard to check if a value is a valid PlatformAuthType
 */
export const isPlatformAuthType = (value: unknown): value is PlatformAuthType => {
  return Object.values(PlatformAuthType).includes(value as PlatformAuthType);
};

/**
 * Type guard to check if a value is a valid PlatformSyncMethod
 */
export const isPlatformSyncMethod = (value: unknown): value is PlatformSyncMethod => {
  return Object.values(PlatformSyncMethod).includes(value as PlatformSyncMethod);
};