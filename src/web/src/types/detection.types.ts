/**
 * @fileoverview TypeScript type definitions for detection-related interfaces, types and enums
 * with enhanced runtime validation and comprehensive metadata support.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { z } from 'zod'; // v3.22.4
import { PlatformType } from '../types/platform.types';
import { User } from '../types/user.types';

/**
 * Detection severity levels
 */
export enum DetectionSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  INFO = 'INFO'
}

/**
 * Performance impact levels for detections
 */
export enum PerformanceImpact {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
  NEGLIGIBLE = 'NEGLIGIBLE'
}

/**
 * Resource usage metrics for detection validation
 */
export interface ResourceUsageMetrics {
  cpuUsage: number;          // CPU usage percentage
  memoryUsage: number;       // Memory usage in MB
  ioOperations: number;      // Number of I/O operations
  processingTime: number;    // Processing time in milliseconds
  resourceScore: number;     // Overall resource efficiency score (0-100)
}

/**
 * Validation issue interface for detection quality checks
 */
export interface ValidationIssue {
  id: string;
  severity: DetectionSeverity;
  message: string;
  location?: {
    line: number;
    column: number;
  };
  suggestedFix?: string;
  ruleId: string;
}

/**
 * Enhanced validation result interface with detailed metrics
 */
export interface ValidationResult {
  detectionId: string;
  platformType: PlatformType;
  issues: ValidationIssue[];
  performanceImpact: PerformanceImpact;
  falsePositiveRate: number;
  validatedAt: Date;
  resourceUsage: ResourceUsageMetrics;
}

/**
 * Comprehensive detection metadata interface
 */
export interface DetectionMetadata {
  mitreTactics: string[];
  mitreTechniques: string[];
  severity: DetectionSeverity;
  confidence: number;          // 0-100
  falsePositiveRate: number;   // 0-100
  mitreVersion: string;
  dataTypes: string[];        // Types of data sources required
  platforms: PlatformType[];
  minimumVersion?: string;    // Minimum platform version required
  author?: User;
  contributors?: User[];
  references?: string[];      // External references and documentation
  tags: string[];
  lastValidated?: Date;
}

/**
 * Version control interface for detections
 */
export interface DetectionVersion {
  versionId: string;
  detectionId: string;
  content: string;
  changes: string;           // Change description
  author: User;
  createdAt: Date;
  validationResult: ValidationResult;
  metadata?: Partial<DetectionMetadata>;
}

/**
 * Main detection interface with comprehensive metadata
 */
export interface Detection {
  id: string;
  name: string;
  description: string;
  content: string;
  platformType: PlatformType;
  version: string;
  owner: User;
  metadata: DetectionMetadata;
  qualityScore: number;      // 0-100
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  platformConfig: Record<PlatformType, object>;
  versions?: DetectionVersion[];
  validationStatus?: ValidationResult;
  deploymentCount?: number;
  lastDeployment?: Date;
}

/**
 * Zod schema for runtime detection validation
 */
export const DetectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  content: z.string().min(1).max(50000),
  platformType: z.nativeEnum(PlatformType),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  owner: z.object({
    id: z.string().uuid(),
    email: z.string().email()
  }),
  metadata: z.object({
    mitreTactics: z.array(z.string()),
    mitreTechniques: z.array(z.string()),
    severity: z.nativeEnum(DetectionSeverity),
    confidence: z.number().min(0).max(100),
    falsePositiveRate: z.number().min(0).max(100),
    mitreVersion: z.string(),
    dataTypes: z.array(z.string()),
    platforms: z.array(z.nativeEnum(PlatformType)),
    minimumVersion: z.string().optional(),
    tags: z.array(z.string())
  }),
  qualityScore: z.number().min(0).max(100),
  tags: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
  platformConfig: z.record(z.nativeEnum(PlatformType), z.object({}))
});

/**
 * Type guard to check if a value is a valid DetectionSeverity
 */
export const isDetectionSeverity = (value: unknown): value is DetectionSeverity => {
  return Object.values(DetectionSeverity).includes(value as DetectionSeverity);
};

/**
 * Type guard to check if a value is a valid PerformanceImpact
 */
export const isPerformanceImpact = (value: unknown): value is PerformanceImpact => {
  return Object.values(PerformanceImpact).includes(value as PerformanceImpact);
};

/**
 * Helper function to calculate detection quality score
 */
export const calculateQualityScore = (
  metadata: DetectionMetadata,
  validationResult: ValidationResult
): number => {
  const weights = {
    confidence: 0.3,
    falsePositiveRate: 0.3,
    performanceImpact: 0.2,
    coverage: 0.2
  };

  const performanceScore = {
    [PerformanceImpact.LOW]: 100,
    [PerformanceImpact.MEDIUM]: 70,
    [PerformanceImpact.HIGH]: 40,
    [PerformanceImpact.NEGLIGIBLE]: 100
  }[validationResult.performanceImpact];

  return Math.round(
    metadata.confidence * weights.confidence +
    (100 - metadata.falsePositiveRate) * weights.falsePositiveRate +
    performanceScore * weights.performanceImpact +
    (metadata.mitreTechniques.length / 10) * 100 * weights.coverage
  );
};