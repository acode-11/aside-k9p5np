/**
 * @fileoverview Enhanced service class for managing security platform integrations,
 * configurations, and operations with comprehensive security, validation, and caching.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import axios from 'axios'; // v1.6.0
import CircuitBreaker from 'opossum'; // v6.0.0
import { injectable } from 'inversify';

import { ApiService } from './api.service';
import {
  IPlatform,
  PlatformType,
  IPlatformCapability,
  IPlatformValidation,
  IPlatformAPIConfig,
  PlatformAuthType,
  PlatformSyncMethod
} from '../types/platform.types';
import {
  validatePlatformConfig,
  getPlatformCapabilities,
  formatPlatformError,
  checkPlatformCompatibility
} from '../utils/platform.utils';
import { apiConfig } from '../config/api.config';

// Constants for platform service configuration
const PLATFORM_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_RETRY_ATTEMPTS = 3;
const CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds

/**
 * Interface for cached platform data with timestamp
 */
interface ICachedPlatform {
  data: IPlatform;
  timestamp: number;
}

/**
 * Interface for platform validation options
 */
interface IValidationOptions {
  validateVersion?: boolean;
  checkCapabilities?: boolean;
  performanceCheck?: boolean;
}

/**
 * Interface for platform deployment options
 */
interface IDeploymentOptions {
  validateFirst?: boolean;
  dryRun?: boolean;
  rollbackOnError?: boolean;
}

/**
 * Interface for deployment result
 */
interface IDeploymentResult {
  success: boolean;
  deploymentId?: string;
  errors?: string[];
  warnings?: string[];
  metrics?: Record<string, any>;
}

/**
 * Enhanced service class for managing platform operations
 */
@injectable()
export class PlatformService {
  private readonly apiService: ApiService;
  private platformCache: Map<string, ICachedPlatform>;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly cacheTTL: number;
  private readonly maxCacheSize: number;
  private rateLimitTracking: Map<string, number[]>;

  /**
   * Initialize platform service with enhanced configuration
   */
  constructor(
    apiService: ApiService,
    circuitBreakerOptions: CircuitBreaker.Options = {}
  ) {
    this.apiService = apiService;
    this.platformCache = new Map();
    this.rateLimitTracking = new Map();
    this.cacheTTL = PLATFORM_CACHE_TTL;
    this.maxCacheSize = MAX_CACHE_SIZE;

    // Configure circuit breaker for API calls
    this.circuitBreaker = new CircuitBreaker(
      async (request: () => Promise<any>) => request(),
      {
        timeout: CIRCUIT_BREAKER_TIMEOUT,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        ...circuitBreakerOptions
      }
    );

    // Set up cache cleanup interval
    setInterval(() => this.cleanupCache(), this.cacheTTL);
  }

  /**
   * Retrieves list of supported platforms with caching
   * @param forceRefresh Force refresh cache
   * @returns Promise resolving to list of platforms
   */
  public async getPlatforms(forceRefresh: boolean = false): Promise<IPlatform[]> {
    try {
      if (!forceRefresh) {
        const cachedPlatforms = Array.from(this.platformCache.values())
          .filter(cache => (Date.now() - cache.timestamp) < this.cacheTTL)
          .map(cache => cache.data);

        if (cachedPlatforms.length > 0) {
          return cachedPlatforms;
        }
      }

      const response = await this.circuitBreaker.fire(async () => {
        return this.apiService.get<IPlatform[]>(apiConfig.baseURL + '/platforms');
      });

      const platforms = response.data;
      
      // Validate and cache platforms
      const validatedPlatforms = await Promise.all(
        platforms.map(async platform => {
          const validation = await this.validatePlatform(platform, { validateVersion: true });
          if (validation.valid) {
            this.cachePlatform(platform.id, platform);
            return platform;
          }
          console.warn(`Platform validation failed: ${platform.id}`, validation.errors);
          return null;
        })
      );

      return validatedPlatforms.filter((p): p is IPlatform => p !== null);
    } catch (error) {
      throw formatPlatformError(error as Error, PlatformType.SIEM);
    }
  }

  /**
   * Retrieves platform configuration by ID with validation
   * @param platformId Platform identifier
   * @param validateVersion Validate platform version
   * @returns Promise resolving to platform configuration
   */
  public async getPlatformById(
    platformId: string,
    validateVersion: boolean = true
  ): Promise<IPlatform> {
    try {
      // Check cache first
      const cached = this.platformCache.get(platformId);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return cached.data;
      }

      const response = await this.circuitBreaker.fire(async () => {
        return this.apiService.get<IPlatform>(
          `${apiConfig.baseURL}/platforms/${platformId}`
        );
      });

      const platform = response.data;

      // Validate platform configuration
      const validation = await this.validatePlatform(platform, { validateVersion });
      if (!validation.valid) {
        throw new Error(`Invalid platform configuration: ${validation.errors.join(', ')}`);
      }

      // Cache valid platform
      this.cachePlatform(platformId, platform);

      return platform;
    } catch (error) {
      throw formatPlatformError(error as Error, PlatformType.SIEM);
    }
  }

  /**
   * Comprehensive platform validation with security checks
   * @param platform Platform configuration to validate
   * @param options Validation options
   * @returns Promise resolving to validation results
   */
  public async validatePlatform(
    platform: IPlatform,
    options: IValidationOptions = {}
  ): Promise<IPlatformValidation> {
    try {
      const validation = validatePlatformConfig(platform);
      const errors: string[] = [...validation.errors];
      const warnings: string[] = [...validation.warnings];

      // Version validation if requested
      if (options.validateVersion) {
        const capabilities = await getPlatformCapabilities(platform.type, platform.version);
        const missingCapabilities = capabilities
          .filter(cap => cap.isRequired)
          .filter(cap => !platform.capabilities.find(pc => pc.name === cap.name));

        if (missingCapabilities.length > 0) {
          errors.push(`Missing required capabilities: ${missingCapabilities.map(c => c.name).join(', ')}`);
        }
      }

      // API configuration validation
      if (platform.apiConfig) {
        if (!Object.values(PlatformAuthType).includes(platform.apiConfig.authType)) {
          errors.push(`Invalid auth type: ${platform.apiConfig.authType}`);
        }

        if (!Object.values(PlatformSyncMethod).includes(platform.apiConfig.syncMethod)) {
          errors.push(`Invalid sync method: ${platform.apiConfig.syncMethod}`);
        }

        if (platform.apiConfig.rateLimits.requests <= 0) {
          errors.push('Invalid rate limit configuration');
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw formatPlatformError(error as Error, platform.type);
    }
  }

  /**
   * Deploys detection content to platform with comprehensive validation
   * @param platformId Target platform ID
   * @param detectionId Detection content ID
   * @param options Deployment options
   * @returns Promise resolving to deployment result
   */
  public async deployToPlatform(
    platformId: string,
    detectionId: string,
    options: IDeploymentOptions = {}
  ): Promise<IDeploymentResult> {
    try {
      // Get platform configuration
      const platform = await this.getPlatformById(platformId);

      // Check rate limits
      if (!this.checkRateLimit(platformId)) {
        throw new Error('Rate limit exceeded for platform deployment');
      }

      // Validate deployment if requested
      if (options.validateFirst) {
        const validation = await this.validatePlatform(platform);
        if (!validation.valid) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings
          };
        }
      }

      // Perform deployment
      const response = await this.circuitBreaker.fire(async () => {
        return this.apiService.post<IDeploymentResult>(
          `${apiConfig.baseURL}/platforms/${platformId}/deploy`,
          {
            detectionId,
            options: {
              dryRun: options.dryRun,
              rollbackOnError: options.rollbackOnError
            }
          }
        );
      });

      return response.data;
    } catch (error) {
      throw formatPlatformError(error as Error, PlatformType.SIEM);
    }
  }

  /**
   * Caches platform data with TTL
   */
  private cachePlatform(platformId: string, platform: IPlatform): void {
    if (this.platformCache.size >= this.maxCacheSize) {
      const oldestKey = Array.from(this.platformCache.keys())[0];
      this.platformCache.delete(oldestKey);
    }

    this.platformCache.set(platformId, {
      data: platform,
      timestamp: Date.now()
    });
  }

  /**
   * Checks rate limits for platform operations
   */
  private checkRateLimit(platformId: string): boolean {
    const now = Date.now();
    const requests = this.rateLimitTracking.get(platformId) || [];
    
    // Clean up old requests
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    
    if (validRequests.length >= MAX_RETRY_ATTEMPTS) {
      return false;
    }

    validRequests.push(now);
    this.rateLimitTracking.set(platformId, validRequests);
    return true;
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.platformCache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.platformCache.delete(key);
      }
    }
  }
}