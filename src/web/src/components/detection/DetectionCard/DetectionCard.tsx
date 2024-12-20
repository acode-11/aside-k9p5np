import React, { useMemo, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  Skeleton,
  TouchRipple
} from '@mui/material'; // v5.14+
import {
  Edit,
  Delete,
  Share,
  PlayArrow,
  ErrorOutline
} from '@mui/icons-material'; // v5.14+

import {
  DetectionCardContainer,
  DetectionCardHeader,
  DetectionCardContent,
  DetectionCardFooter
} from './DetectionCard.styles';

import {
  Detection,
  DetectionSeverity,
  DetectionMetadata
} from '../../../types/detection.types';

import { useDetection } from '../../../hooks/useDetection';

// Interface for component props
interface DetectionCardProps {
  detection: Detection;
  isLoading?: boolean;
  viewMode: 'list' | 'grid';
  onEdit?: (detection: Detection) => void;
  onDelete?: (id: string) => void;
  onDeploy?: (detection: Detection) => void;
  className?: string;
  testId?: string;
}

/**
 * Maps severity levels to theme-aware colors
 */
const getSeverityColor = (severity: DetectionSeverity): string => {
  const severityColors: Record<DetectionSeverity, string> = {
    CRITICAL: 'error.main',
    HIGH: 'error.light',
    MEDIUM: 'warning.main',
    LOW: 'success.main',
    INFO: 'info.main'
  };
  return severityColors[severity] || 'info.main';
};

/**
 * Formats quality score for display with accessibility considerations
 */
const formatQualityScore = (score: number): string => {
  const percentage = Math.round(score * 100);
  return `${percentage}% Quality Score`;
};

/**
 * DetectionCard component displaying detection information with enhanced accessibility
 * and responsive design supporting both list and grid views.
 */
export const DetectionCard: React.FC<DetectionCardProps> = ({
  detection,
  isLoading = false,
  viewMode,
  onEdit,
  onDelete,
  onDeploy,
  className,
  testId
}) => {
  const rippleRef = useRef<any>(null);
  const { validateDetection } = useDetection();

  // Memoized metadata for performance
  const metadata = useMemo(() => {
    return {
      severity: detection.metadata.severity,
      platforms: detection.metadata.platforms,
      lastValidated: detection.metadata.lastValidated,
      qualityScore: detection.qualityScore
    };
  }, [detection.metadata, detection.qualityScore]);

  // Event handlers with touch support
  const handleEdit = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit?.(detection);
  }, [detection, onEdit]);

  const handleDelete = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete?.(detection.id);
  }, [detection.id, onDelete]);

  const handleDeploy = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await validateDetection(detection.id, detection.platformType);
      onDeploy?.(detection);
    } catch (error) {
      console.error('Validation failed before deployment:', error);
    }
  }, [detection, validateDetection, onDeploy]);

  if (isLoading) {
    return (
      <DetectionCardContainer viewMode={viewMode} data-testid={`${testId}-loading`}>
        <Skeleton variant="rectangular" height={200} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="40%" />
      </DetectionCardContainer>
    );
  }

  return (
    <DetectionCardContainer
      viewMode={viewMode}
      className={className}
      data-testid={testId}
      tabIndex={0}
      role="article"
      aria-label={`Detection: ${detection.name}`}
    >
      <TouchRipple ref={rippleRef} />

      <DetectionCardHeader>
        <Typography variant="h3" component="h3">
          {detection.name}
        </Typography>
        <div className="metadata">
          <Tooltip title={`Severity: ${metadata.severity}`}>
            <Chip
              size="small"
              label={metadata.severity}
              color="default"
              sx={{ bgcolor: getSeverityColor(metadata.severity) }}
            />
          </Tooltip>
          <Tooltip title={formatQualityScore(metadata.qualityScore)}>
            <Chip
              size="small"
              label={`${Math.round(metadata.qualityScore * 100)}%`}
              color="primary"
            />
          </Tooltip>
        </div>
      </DetectionCardHeader>

      <DetectionCardContent>
        <Typography component="p">
          {detection.description}
        </Typography>
        <div className="tags">
          {metadata.platforms.map(platform => (
            <Chip
              key={platform}
              size="small"
              label={platform}
              variant="outlined"
            />
          ))}
        </div>
      </DetectionCardContent>

      <DetectionCardFooter>
        <div>
          {metadata.lastValidated && (
            <Typography variant="caption" color="text.secondary">
              Last validated: {new Date(metadata.lastValidated).toLocaleDateString()}
            </Typography>
          )}
        </div>
        <div>
          <Tooltip title="Edit Detection">
            <IconButton
              onClick={handleEdit}
              aria-label="Edit detection"
              size="small"
            >
              <Edit />
            </IconButton>
          </Tooltip>
          <Tooltip title="Share Detection">
            <IconButton
              onClick={(e) => e.stopPropagation()}
              aria-label="Share detection"
              size="small"
            >
              <Share />
            </IconButton>
          </Tooltip>
          <Tooltip title="Deploy Detection">
            <IconButton
              onClick={handleDeploy}
              aria-label="Deploy detection"
              size="small"
              color="primary"
            >
              <PlayArrow />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Detection">
            <IconButton
              onClick={handleDelete}
              aria-label="Delete detection"
              size="small"
              color="error"
            >
              <Delete />
            </IconButton>
          </Tooltip>
        </div>
      </DetectionCardFooter>
    </DetectionCardContainer>
  );
};

export default DetectionCard;