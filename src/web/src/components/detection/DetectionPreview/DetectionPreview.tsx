import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { Typography, CircularProgress, Alert, Tooltip, Skeleton } from '@mui/material'; // v5.14+
import SyntaxHighlighter from 'react-syntax-highlighter'; // v15.5+

import {
  PreviewContainer,
  PreviewHeader,
  PreviewContent,
  ValidationResults
} from './DetectionPreview.styles';

import {
  Detection,
  ValidationResult,
  PlatformType,
  PerformanceImpact
} from '../../../types/detection.types';

import { useDetection, useDebounce } from '../../../hooks/useDetection';

// Platform-specific syntax highlighting themes
const SYNTAX_THEMES = {
  [PlatformType.SIEM]: 'vs',
  [PlatformType.EDR]: 'monokai',
  [PlatformType.NSM]: 'github'
} as const;

// Accessibility labels for screen readers
const ACCESSIBILITY_LABELS = {
  preview: 'Detection Preview',
  validation: 'Validation Results',
  performance: 'Performance Impact',
  platform: 'Platform Selection'
} as const;

interface DetectionPreviewProps {
  detection: Detection;
  isLoading?: boolean;
  defaultPlatform?: PlatformType;
  onValidationComplete?: (result: ValidationResult) => void;
}

/**
 * Enhanced detection preview component with real-time validation and accessibility support
 */
export const DetectionPreview: React.FC<DetectionPreviewProps> = React.memo(({
  detection,
  isLoading = false,
  defaultPlatform = PlatformType.SIEM,
  onValidationComplete
}) => {
  // Hooks and refs
  const previewRef = useRef<HTMLDivElement>(null);
  const { validateDetection } = useDetection();
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null);
  const [selectedPlatform, setSelectedPlatform] = React.useState<PlatformType>(defaultPlatform);
  const [error, setError] = React.useState<string | null>(null);

  // Debounced validation to prevent excessive API calls
  const [debouncedContent] = useDebounce(detection.content, 500);

  /**
   * Memoized formatted content with platform-specific highlighting
   */
  const formattedContent = useMemo(() => {
    try {
      return {
        content: detection.content,
        language: selectedPlatform.toLowerCase(),
        theme: SYNTAX_THEMES[selectedPlatform]
      };
    } catch (error) {
      console.error('Error formatting content:', error);
      return { content: '', language: 'text', theme: SYNTAX_THEMES[PlatformType.SIEM] };
    }
  }, [detection.content, selectedPlatform]);

  /**
   * Handle platform change with validation
   */
  const handlePlatformChange = useCallback(async (platform: PlatformType) => {
    try {
      setSelectedPlatform(platform);
      const result = await validateDetection(detection.id, platform);
      setValidationResult(result);
      onValidationComplete?.(result);
    } catch (error) {
      setError('Failed to validate detection for selected platform');
      console.error('Platform validation error:', error);
    }
  }, [detection.id, validateDetection, onValidationComplete]);

  /**
   * Validate detection content when it changes
   */
  useEffect(() => {
    const validateContent = async () => {
      try {
        const result = await validateDetection(detection.id, selectedPlatform);
        setValidationResult(result);
        onValidationComplete?.(result);
      } catch (error) {
        setError('Validation failed');
        console.error('Content validation error:', error);
      }
    };

    if (debouncedContent) {
      validateContent();
    }
  }, [debouncedContent, detection.id, selectedPlatform, validateDetection, onValidationComplete]);

  /**
   * Handle keyboard navigation
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && previewRef.current) {
        previewRef.current.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <PreviewContainer>
        <Skeleton variant="rectangular" height={400} animation="wave" />
      </PreviewContainer>
    );
  }

  return (
    <PreviewContainer
      ref={previewRef}
      tabIndex={0}
      role="region"
      aria-label={ACCESSIBILITY_LABELS.preview}
    >
      <PreviewHeader>
        <Typography variant="h6" component="h2">
          Detection Preview
        </Typography>
        <select
          value={selectedPlatform}
          onChange={(e) => handlePlatformChange(e.target.value as PlatformType)}
          aria-label={ACCESSIBILITY_LABELS.platform}
        >
          {Object.values(PlatformType).map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </PreviewHeader>

      <PreviewContent>
        {error ? (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : (
          <SyntaxHighlighter
            language={formattedContent.language}
            style={formattedContent.theme}
            customStyle={{ margin: 0 }}
            aria-label="Detection code"
          >
            {formattedContent.content}
          </SyntaxHighlighter>
        )}
      </PreviewContent>

      {validationResult && (
        <ValidationResults
          role="complementary"
          aria-label={ACCESSIBILITY_LABELS.validation}
        >
          <Typography variant="subtitle1" gutterBottom>
            Validation Results
          </Typography>
          
          {validationResult.issues.length > 0 ? (
            validationResult.issues.map((issue, index) => (
              <Alert
                key={issue.id || index}
                severity={issue.severity.toLowerCase() as any}
                sx={{ mb: 1 }}
              >
                {issue.message}
                {issue.suggestedFix && (
                  <Tooltip title="Click to apply fix">
                    <Typography
                      variant="body2"
                      sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Suggested Fix: {issue.suggestedFix}
                    </Typography>
                  </Tooltip>
                )}
              </Alert>
            ))
          ) : (
            <Alert severity="success">No validation issues found</Alert>
          )}

          <Typography variant="body2" sx={{ mt: 2 }}>
            Performance Impact:{' '}
            <Tooltip title={`Resource Score: ${validationResult.resourceUsage.resourceScore}%`}>
              <span>
                {validationResult.performanceImpact === PerformanceImpact.LOW && '🟢'}
                {validationResult.performanceImpact === PerformanceImpact.MEDIUM && '🟡'}
                {validationResult.performanceImpact === PerformanceImpact.HIGH && '🔴'}
                {' '}{validationResult.performanceImpact}
              </span>
            </Tooltip>
          </Typography>
        </ValidationResults>
      )}
    </PreviewContainer>
  );
});

DetectionPreview.displayName = 'DetectionPreview';

export default DetectionPreview;