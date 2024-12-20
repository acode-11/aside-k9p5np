/**
 * @fileoverview Utility functions for handling detection content manipulation, transformation,
 * and helper operations with enhanced performance optimization and validation capabilities.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import dayjs from 'dayjs'; // v1.11.10
import { Detection } from '../types/detection.types';
import { validateDetection } from './validation.utils';

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const qualityScoreCache = new Map<string, { score: number; timestamp: number }>();
const mitreCache = new Map<string, { tactics: string[]; timestamp: number }>();

/**
 * Formats detection creation and update dates for display with timezone support
 * @param date Date to format
 * @param format Optional format string (defaults to 'YYYY-MM-DD HH:mm:ss z')
 * @returns Formatted date string with timezone
 */
export function formatDetectionDate(date: Date, format?: string): string {
  if (!date) {
    return '';
  }

  try {
    return dayjs(date).format(format || 'YYYY-MM-DD HH:mm:ss z');
  } catch (error) {
    console.error('Error formatting detection date:', error);
    return date.toISOString();
  }
}

/**
 * Calculates overall detection quality score with enhanced algorithm and caching
 * @param detection Detection object to score
 * @returns Quality score between 0-100 with confidence level
 */
export async function calculateQualityScore(detection: Detection): Promise<number> {
  const cacheKey = `${detection.id}-${detection.version}`;
  const now = Date.now();

  // Check cache first
  const cached = qualityScoreCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.score;
  }

  // Calculate new score
  try {
    // Get validation results for scoring
    const validationResult = await validateDetection(detection);

    // Weight factors for scoring components
    const weights = {
      metadata: 0.25,
      mitreMappings: 0.25,
      falsePositiveRate: 0.30,
      complexity: 0.20
    };

    // Calculate component scores
    const metadataScore = calculateMetadataCompleteness(detection.metadata);
    const mitreScore = calculateMitreMappingAccuracy(detection.metadata);
    const fpScore = Math.max(0, 100 - (detection.metadata.falsePositiveRate * 20));
    const complexityScore = calculateComplexityScore(detection, validationResult);

    // Calculate weighted final score
    const finalScore = Math.round(
      metadataScore * weights.metadata +
      mitreScore * weights.mitreMappings +
      fpScore * weights.falsePositiveRate +
      complexityScore * weights.complexity
    );

    // Cache the result
    qualityScoreCache.set(cacheKey, { score: finalScore, timestamp: now });
    return finalScore;

  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0;
  }
}

/**
 * Extracts and validates MITRE ATT&CK tactics with enhanced caching
 * @param content Detection content to analyze
 * @returns Array of validated MITRE tactic IDs with metadata
 */
export function extractMitreTactics(content: string): string[] {
  const cacheKey = content;
  const now = Date.now();

  // Check cache first
  const cached = mitreCache.get(cacheKey);
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    return cached.tactics;
  }

  try {
    // Extract MITRE tactic references using regex
    const tacticPattern = /t\d{4}(?:\.\d{3})?/gi;
    const matches = content.match(tacticPattern) || [];
    
    // Validate and deduplicate tactics
    const validTactics = [...new Set(matches)]
      .filter(tactic => validateMitreTactic(tactic))
      .map(tactic => tactic.toUpperCase());

    // Cache the results
    mitreCache.set(cacheKey, { tactics: validTactics, timestamp: now });
    return validTactics;

  } catch (error) {
    console.error('Error extracting MITRE tactics:', error);
    return [];
  }
}

/**
 * Generates comprehensive detection summary with performance metrics
 * @param detection Detection to summarize
 * @returns Enhanced detection summary with metrics
 */
export function generateDetectionSummary(detection: Detection): string {
  try {
    const {
      name,
      description,
      metadata,
      qualityScore,
      platformType,
      version
    } = detection;

    const tactics = extractMitreTactics(detection.content);
    const formattedDate = formatDetectionDate(detection.updatedAt);

    return `
# ${name} (v${version})

${description}

## Metadata
- Platform: ${platformType}
- Severity: ${metadata.severity}
- Quality Score: ${qualityScore}/100
- False Positive Rate: ${metadata.falsePositiveRate}%
- Last Updated: ${formattedDate}

## MITRE ATT&CK Coverage
${tactics.map(tactic => `- ${tactic}`).join('\n')}

## Performance Metrics
- Confidence Level: ${metadata.confidence}%
- Data Sources: ${metadata.dataTypes.join(', ')}
- Supported Platforms: ${metadata.platforms.join(', ')}
${metadata.minimumVersion ? `- Minimum Version: ${metadata.minimumVersion}` : ''}

## References
${metadata.references ? metadata.references.map(ref => `- ${ref}`).join('\n') : 'No references provided'}
    `.trim();

  } catch (error) {
    console.error('Error generating detection summary:', error);
    return 'Error generating detection summary';
  }
}

// Helper functions

/**
 * Calculates metadata completeness score
 */
function calculateMetadataCompleteness(metadata: Detection['metadata']): number {
  const requiredFields = [
    'mitreTactics',
    'mitreTechniques',
    'severity',
    'confidence',
    'falsePositiveRate',
    'dataTypes',
    'platforms'
  ];

  const completedFields = requiredFields.filter(field => 
    metadata[field] && 
    (Array.isArray(metadata[field]) ? metadata[field].length > 0 : true)
  );

  return Math.round((completedFields.length / requiredFields.length) * 100);
}

/**
 * Calculates MITRE mapping accuracy score
 */
function calculateMitreMappingAccuracy(metadata: Detection['metadata']): number {
  const hasTactics = metadata.mitreTactics.length > 0;
  const hasTechniques = metadata.mitreTechniques.length > 0;
  const hasValidMappings = metadata.mitreTactics.every(validateMitreTactic);

  return Math.round(
    ((hasTactics ? 33 : 0) +
    (hasTechniques ? 33 : 0) +
    (hasValidMappings ? 34 : 0))
  );
}

/**
 * Calculates complexity score based on detection content
 */
function calculateComplexityScore(
  detection: Detection,
  validationResult: Awaited<ReturnType<typeof validateDetection>>
): number {
  const contentLength = detection.content.length;
  const maxLength = 50000; // Maximum recommended content length
  const lengthScore = Math.max(0, 100 - (contentLength / maxLength * 100));
  
  const issueScore = Math.max(0, 100 - (validationResult.issues.length * 10));
  
  return Math.round((lengthScore + issueScore) / 2);
}

/**
 * Validates MITRE tactic ID format
 */
function validateMitreTactic(tactic: string): boolean {
  const tacticPattern = /^T\d{4}(?:\.\d{3})?$/i;
  return tacticPattern.test(tactic);
}