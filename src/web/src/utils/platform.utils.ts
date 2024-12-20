/**
 * @fileoverview Comprehensive utility functions for security platform operations
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { z } from 'zod'; // v3.22.4
import {
  IPlatform,
  PlatformType,
  platformSchema,
  PLATFORM_VERSION_PATTERNS,
  PlatformAuthType,
  IPlatformCapability,
  PlatformSyncMethod
} from '../types/platform.types';

/**
 * Platform version constraints for compatibility checks
 */
const PLATFORM_VERSION_CONSTRAINTS: Record<PlatformType, string> = {
  [PlatformType.SIEM]: '>=8.0.0',
  [PlatformType.EDR]: '>=6.0.0',
  [PlatformType.NSM]: '>=4.0.0'
};

/**
 * Platform-specific error codes for standardized error handling
 */
const PLATFORM_ERROR_CODES = {
  INVALID_CONFIG: 'PLATFORM_001',
  VERSION_MISMATCH: 'PLATFORM_002',
  CAPABILITY_NOT_SUPPORTED: 'PLATFORM_003',
  SIZE_EXCEEDED: 'PLATFORM_004',
  API_CONFIG_INVALID: 'PLATFORM_005',
  RATE_LIMIT_INVALID: 'PLATFORM_006',
  AUTH_CONFIG_INVALID: 'PLATFORM_007',
  ENDPOINT_INVALID: 'PLATFORM_008'
} as const;

/**
 * Cache configuration for platform capabilities
 */
const PLATFORM_CACHE_CONFIG = {
  TTL: 300000, // 5 minutes in milliseconds
  MAX_ENTRIES: 1000
} as const;

/**
 * Platform capability cache for performance optimization
 */
const capabilityCache = new Map<string, { 
  capabilities: IPlatformCapability[]; 
  timestamp: number; 
}>();

/**
 * Validates platform configuration with comprehensive checks
 * @param config - Platform configuration object
 * @returns Validation result with detailed errors and warnings
 */
export const validatePlatformConfig = (
  config: Record<string, any>
): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Schema validation
    const validationResult = platformSchema.safeParse(config);
    if (!validationResult.success) {
      errors.push(...validationResult.error.errors.map(err => err.message));
      return { valid: false, errors, warnings };
    }

    // Version validation
    const versionPattern = new RegExp(PLATFORM_VERSION_PATTERNS[config.type]);
    if (!versionPattern.test(config.version)) {
      errors.push(`Invalid version format for ${config.type}: ${config.version}`);
    }

    // API configuration validation
    if (config.apiConfig) {
      if (!Object.values(PlatformAuthType).includes(config.apiConfig.authType)) {
        errors.push(`Invalid authentication type: ${config.apiConfig.authType}`);
      }

      if (config.apiConfig.rateLimits.requests <= 0) {
        errors.push('Rate limit must be positive');
      }

      if (!Object.values(PlatformSyncMethod).includes(config.apiConfig.syncMethod)) {
        errors.push(`Invalid sync method: ${config.apiConfig.syncMethod}`);
      }
    }

    // Capability validation
    if (config.capabilities) {
      config.capabilities.forEach((capability: IPlatformCapability) => {
        if (!capability.name || !capability.version) {
          errors.push(`Invalid capability configuration: ${capability.name}`);
        }
      });
    }

    // Generate warnings for potential issues
    if (config.apiConfig?.rateLimits.requests > 2000) {
      warnings.push('High rate limit may impact platform performance');
    }

    if (config.capabilities?.length === 0) {
      warnings.push('No capabilities defined for platform');
    }

  } catch (error) {
    errors.push(`Validation error: ${(error as Error).message}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Retrieves platform capabilities with version-specific features
 * @param platformType - Type of security platform
 * @param version - Platform version
 * @returns Array of supported capabilities
 */
export const getPlatformCapabilities = (
  platformType: PlatformType,
  version: string
): IPlatformCapability[] => {
  const cacheKey = `${platformType}-${version}`;
  const cached = capabilityCache.get(cacheKey);

  if (cached && (Date.now() - cached.timestamp) < PLATFORM_CACHE_CONFIG.TTL) {
    return cached.capabilities;
  }

  // Version-specific capability mapping
  const capabilities: IPlatformCapability[] = [];
  
  switch (platformType) {
    case PlatformType.SIEM:
      capabilities.push(
        {
          name: 'rule_creation',
          description: 'Create and manage detection rules',
          parameters: [],
          constraints: { maxRuleSize: 50000 },
          isRequired: true,
          version: '>=8.0.0'
        },
        {
          name: 'correlation',
          description: 'Event correlation capabilities',
          parameters: [],
          constraints: { maxCorrelationWindow: 3600 },
          isRequired: false,
          version: '>=8.2.0'
        }
      );
      break;

    case PlatformType.EDR:
      capabilities.push(
        {
          name: 'endpoint_monitoring',
          description: 'Real-time endpoint monitoring',
          parameters: [],
          constraints: { maxEndpoints: 10000 },
          isRequired: true,
          version: '>=6.0.0'
        }
      );
      break;

    case PlatformType.NSM:
      capabilities.push(
        {
          name: 'network_detection',
          description: 'Network traffic analysis',
          parameters: [],
          constraints: { maxBandwidth: '10Gbps' },
          isRequired: true,
          version: '>=4.0.0'
        }
      );
      break;
  }

  // Cache the results
  if (capabilityCache.size >= PLATFORM_CACHE_CONFIG.MAX_ENTRIES) {
    const oldestKey = Array.from(capabilityCache.keys())[0];
    capabilityCache.delete(oldestKey);
  }

  capabilityCache.set(cacheKey, {
    capabilities,
    timestamp: Date.now()
  });

  return capabilities;
};

/**
 * Formats platform errors with detailed context and resolution steps
 * @param error - Error object
 * @param platformType - Type of security platform
 * @returns Formatted error object with context and resolution
 */
export const formatPlatformError = (
  error: Error,
  platformType: PlatformType
): { message: string; code: string; context: any; resolution: string } => {
  let errorCode = PLATFORM_ERROR_CODES.INVALID_CONFIG;
  let resolution = 'Please check the platform configuration and try again.';
  let context = {};

  if (error.message.includes('version')) {
    errorCode = PLATFORM_ERROR_CODES.VERSION_MISMATCH;
    resolution = `Ensure platform version meets minimum requirements: ${PLATFORM_VERSION_CONSTRAINTS[platformType]}`;
    context = { supportedVersions: PLATFORM_VERSION_CONSTRAINTS };
  } else if (error.message.includes('capability')) {
    errorCode = PLATFORM_ERROR_CODES.CAPABILITY_NOT_SUPPORTED;
    resolution = 'Verify the requested capability is supported by the platform version.';
    context = { supportedCapabilities: getPlatformCapabilities(platformType, '0.0.0') };
  }

  return {
    message: error.message,
    code: errorCode,
    context,
    resolution
  };
};

/**
 * Checks platform compatibility with detection content
 * @param platform - Platform configuration
 * @param detection - Detection content
 * @returns Detailed compatibility assessment
 */
export const checkPlatformCompatibility = (
  platform: IPlatform,
  detection: Record<string, any>
): {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
  performance: { impact: 'low' | 'medium' | 'high'; metrics: Record<string, number> };
} => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const performanceMetrics: Record<string, number> = {};

  // Version compatibility
  const versionPattern = new RegExp(PLATFORM_VERSION_PATTERNS[platform.type]);
  if (!versionPattern.test(platform.version)) {
    issues.push(`Incompatible platform version: ${platform.version}`);
  }

  // Size constraints
  const detectionSize = JSON.stringify(detection).length;
  if (detectionSize > platform.validationRules.maxSize) {
    issues.push(`Detection size (${detectionSize} bytes) exceeds platform limit`);
    recommendations.push('Consider optimizing detection content size');
  }
  performanceMetrics.size = detectionSize;

  // Capability requirements
  platform.capabilities.forEach(capability => {
    if (capability.isRequired && !detection[capability.name]) {
      issues.push(`Missing required capability: ${capability.name}`);
    }
  });

  // Syntax validation
  platform.validationRules.syntaxPatterns.forEach(pattern => {
    if (!pattern.test(JSON.stringify(detection))) {
      issues.push('Detection syntax does not match platform requirements');
    }
  });

  // Performance impact assessment
  const performanceImpact = detectionSize > platform.validationRules.maxSize / 2 ? 'high' :
    detectionSize > platform.validationRules.maxSize / 4 ? 'medium' : 'low';

  if (performanceImpact !== 'low') {
    recommendations.push('Consider implementing detection content optimization');
  }

  return {
    compatible: issues.length === 0,
    issues,
    recommendations,
    performance: {
      impact: performanceImpact,
      metrics: performanceMetrics
    }
  };
};