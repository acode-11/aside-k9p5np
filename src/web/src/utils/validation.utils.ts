/**
 * @fileoverview Comprehensive validation utilities for detection content, metadata,
 * and platform compatibility with performance impact assessment.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { z } from 'zod'; // v3.22.4
import {
  Detection,
  DetectionMetadata,
  ValidationResult,
  ValidationIssue,
  DetectionSeverity,
  PerformanceImpact,
  ResourceUsageMetrics,
  calculateQualityScore
} from '../types/detection.types';
import {
  PlatformType,
  IPlatformValidation,
  PLATFORM_VERSION_PATTERNS
} from '../types/platform.types';

// Constants for validation rules
export const MAX_CONTENT_SIZE = 1048576; // 1MB max content size
export const MIN_CONFIDENCE_SCORE = 0;
export const MAX_CONFIDENCE_SCORE = 100;
export const MAX_FALSE_POSITIVE_RATE = 5; // 5% threshold as per requirements

/**
 * Schema for detection content validation
 */
const detectionContentSchema = z.object({
  content: z.string().min(1).max(MAX_CONTENT_SIZE),
  metadata: z.object({
    mitreTactics: z.array(z.string()).min(1),
    mitreTechniques: z.array(z.string()).min(1),
    severity: z.nativeEnum(DetectionSeverity),
    confidence: z.number().min(MIN_CONFIDENCE_SCORE).max(MAX_CONFIDENCE_SCORE),
    falsePositiveRate: z.number().min(0).max(MAX_FALSE_POSITIVE_RATE),
    platforms: z.array(z.nativeEnum(PlatformType)).min(1)
  })
});

/**
 * Cache for validation results to optimize performance
 */
const validationCache = new Map<string, ValidationResult>();

/**
 * Validates detection content with comprehensive checks and performance assessment
 * @param detection Detection object to validate
 * @returns Promise<ValidationResult> Detailed validation results
 */
export async function validateDetection(detection: Detection): Promise<ValidationResult> {
  // Check cache first
  const cacheKey = `${detection.id}-${detection.version}`;
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }

  const issues: ValidationIssue[] = [];
  let performanceImpact: PerformanceImpact = PerformanceImpact.LOW;

  try {
    // Basic schema validation
    await detectionContentSchema.parseAsync({
      content: detection.content,
      metadata: detection.metadata
    });

    // Validate metadata
    const metadataIssues = validateMetadata(detection.metadata);
    issues.push(...metadataIssues);

    // Platform-specific validation
    const platformIssues = await validatePlatformCompatibility(
      detection.content,
      detection.platformType,
      getPlatformValidationRules(detection.platformType)
    );
    issues.push(...platformIssues);

    // Assess performance impact
    const resourceMetrics = await assessResourceUsage(detection);
    performanceImpact = calculatePerformanceImpact(resourceMetrics);

    const result: ValidationResult = {
      detectionId: detection.id,
      platformType: detection.platformType,
      issues,
      performanceImpact,
      falsePositiveRate: detection.metadata.falsePositiveRate,
      validatedAt: new Date(),
      resourceUsage: resourceMetrics
    };

    // Cache the result
    validationCache.set(cacheKey, result);
    return result;

  } catch (error) {
    issues.push({
      id: 'VALIDATION_ERROR',
      severity: DetectionSeverity.HIGH,
      message: error instanceof Error ? error.message : 'Unknown validation error',
      ruleId: 'SCHEMA_VALIDATION'
    });

    return {
      detectionId: detection.id,
      platformType: detection.platformType,
      issues,
      performanceImpact: PerformanceImpact.HIGH,
      falsePositiveRate: detection.metadata.falsePositiveRate,
      validatedAt: new Date(),
      resourceUsage: getDefaultResourceMetrics()
    };
  }
}

/**
 * Validates detection metadata for completeness and accuracy
 * @param metadata DetectionMetadata to validate
 * @returns ValidationIssue[] Array of validation issues
 */
export function validateMetadata(metadata: DetectionMetadata): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate MITRE mappings
  if (!metadata.mitreTactics.length) {
    issues.push({
      id: 'MISSING_MITRE_TACTICS',
      severity: DetectionSeverity.HIGH,
      message: 'At least one MITRE tactic must be specified',
      ruleId: 'MITRE_MAPPING'
    });
  }

  if (!metadata.mitreTechniques.length) {
    issues.push({
      id: 'MISSING_MITRE_TECHNIQUES',
      severity: DetectionSeverity.HIGH,
      message: 'At least one MITRE technique must be specified',
      ruleId: 'MITRE_MAPPING'
    });
  }

  // Validate false positive rate
  if (metadata.falsePositiveRate > MAX_FALSE_POSITIVE_RATE) {
    issues.push({
      id: 'HIGH_FALSE_POSITIVE_RATE',
      severity: DetectionSeverity.HIGH,
      message: `False positive rate exceeds maximum threshold of ${MAX_FALSE_POSITIVE_RATE}%`,
      ruleId: 'FALSE_POSITIVE_RATE'
    });
  }

  // Validate confidence score
  if (metadata.confidence < MIN_CONFIDENCE_SCORE || metadata.confidence > MAX_CONFIDENCE_SCORE) {
    issues.push({
      id: 'INVALID_CONFIDENCE_SCORE',
      severity: DetectionSeverity.MEDIUM,
      message: 'Confidence score must be between 0 and 100',
      ruleId: 'CONFIDENCE_SCORE'
    });
  }

  return issues;
}

/**
 * Validates detection compatibility with platform-specific requirements
 * @param content Detection content to validate
 * @param platformType Target platform type
 * @param platformRules Platform-specific validation rules
 * @returns ValidationIssue[] Array of platform-specific validation issues
 */
export async function validatePlatformCompatibility(
  content: string,
  platformType: PlatformType,
  platformRules: IPlatformValidation
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Check content size
  if (content.length > platformRules.maxSize) {
    issues.push({
      id: 'CONTENT_SIZE_EXCEEDED',
      severity: DetectionSeverity.HIGH,
      message: `Content size exceeds platform limit of ${platformRules.maxSize} bytes`,
      ruleId: 'PLATFORM_SIZE_LIMIT'
    });
  }

  // Validate syntax patterns
  for (const pattern of platformRules.syntaxPatterns) {
    if (!pattern.test(content)) {
      issues.push({
        id: 'INVALID_SYNTAX_PATTERN',
        severity: DetectionSeverity.HIGH,
        message: `Content does not match required platform syntax pattern: ${pattern}`,
        ruleId: 'PLATFORM_SYNTAX'
      });
    }
  }

  // Validate platform-specific rules
  for (const rule of platformRules.rules) {
    try {
      await validatePlatformRule(content, rule, platformType);
    } catch (error) {
      issues.push({
        id: 'PLATFORM_RULE_VIOLATION',
        severity: DetectionSeverity.MEDIUM,
        message: error instanceof Error ? error.message : `Platform rule violation: ${rule}`,
        ruleId: `PLATFORM_RULE_${rule}`
      });
    }
  }

  return issues;
}

/**
 * Assesses resource usage metrics for a detection
 * @param detection Detection to assess
 * @returns Promise<ResourceUsageMetrics> Resource usage metrics
 */
async function assessResourceUsage(detection: Detection): Promise<ResourceUsageMetrics> {
  // Implementation would include actual performance testing
  // This is a simplified version for demonstration
  return {
    cpuUsage: calculateCpuUsage(detection.content),
    memoryUsage: calculateMemoryUsage(detection.content),
    ioOperations: estimateIoOperations(detection.content),
    processingTime: estimateProcessingTime(detection.content),
    resourceScore: calculateResourceScore(detection)
  };
}

/**
 * Calculates performance impact based on resource metrics
 * @param metrics Resource usage metrics
 * @returns PerformanceImpact Performance impact level
 */
function calculatePerformanceImpact(metrics: ResourceUsageMetrics): PerformanceImpact {
  if (metrics.resourceScore >= 90) {
    return PerformanceImpact.LOW;
  } else if (metrics.resourceScore >= 70) {
    return PerformanceImpact.MEDIUM;
  }
  return PerformanceImpact.HIGH;
}

/**
 * Gets default resource metrics
 * @returns ResourceUsageMetrics Default metrics
 */
function getDefaultResourceMetrics(): ResourceUsageMetrics {
  return {
    cpuUsage: 0,
    memoryUsage: 0,
    ioOperations: 0,
    processingTime: 0,
    resourceScore: 100
  };
}

// Helper functions for resource calculations
function calculateCpuUsage(content: string): number {
  return Math.min(content.length / 10000, 100);
}

function calculateMemoryUsage(content: string): number {
  return content.length * 2; // Bytes
}

function estimateIoOperations(content: string): number {
  return Math.ceil(content.length / 1000);
}

function estimateProcessingTime(content: string): number {
  return content.length / 100; // Milliseconds
}

function calculateResourceScore(detection: Detection): number {
  return Math.min(100, 100 - (detection.content.length / MAX_CONTENT_SIZE) * 100);
}

/**
 * Gets platform-specific validation rules
 * @param platformType Platform type
 * @returns IPlatformValidation Platform validation rules
 */
function getPlatformValidationRules(platformType: PlatformType): IPlatformValidation {
  // Platform-specific rules would be loaded from configuration
  return {
    rules: ['syntax_check', 'field_validation', 'size_limit'],
    maxSize: MAX_CONTENT_SIZE,
    syntaxPatterns: [new RegExp(PLATFORM_VERSION_PATTERNS[platformType])],
    requiredFields: ['rule_name', 'description', 'condition'],
    customValidators: []
  };
}

/**
 * Validates a specific platform rule
 * @param content Detection content
 * @param rule Rule to validate
 * @param platformType Platform type
 */
async function validatePlatformRule(
  content: string,
  rule: string,
  platformType: PlatformType
): Promise<void> {
  // Implementation would include actual rule validation logic
  // This is a placeholder for demonstration
  if (!content.includes(rule)) {
    throw new Error(`Content does not satisfy platform rule: ${rule}`);
  }
}