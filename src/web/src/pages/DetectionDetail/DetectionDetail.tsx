import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Alert
} from '@mui/material';

import {
  Detection,
  DetectionSeverity,
  PerformanceImpact,
  ValidationResult
} from '../../types/detection.types';
import { PlatformType } from '../../types/platform.types';
import DetectionEditor from '../../components/detection/DetectionEditor/DetectionEditor';
import useDetection from '../../hooks/useDetection';
import { bodyStyles, headingStyles } from '../../styles/typography.styles';
import { COLORS } from '../../constants/theme.constants';

// Constants for component behavior
const AUTOSAVE_DELAY_MS = 2000;
const VALIDATION_CACHE_TTL = 300000; // 5 minutes
const PERFORMANCE_THRESHOLD_MS = 100;

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`detection-tabpanel-${index}`}
    aria-labelledby={`detection-tab-${index}`}
  >
    {value === index && children}
  </div>
);

/**
 * Enhanced Detection Detail page component with comprehensive validation
 * and platform-specific features
 */
const DetectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Get platform type from URL query params or default to SIEM
  const platformType = (new URLSearchParams(location.search).get('platform') as PlatformType) || PlatformType.SIEM;

  // Local state
  const [detection, setDetection] = useState<Detection | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  const [validationStatus, setValidationStatus] = useState<ValidationResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom hooks
  const {
    fetchDetectionById,
    updateDetection,
    validateDetection,
    loading,
    error: detectionError
  } = useDetection();

  // Fetch detection data on mount
  useEffect(() => {
    const loadDetection = async () => {
      if (!id) return;
      try {
        const result = await fetchDetectionById(id);
        if (result) {
          setDetection(result);
          // Initial validation
          handleValidate(result.id, platformType);
        }
      } catch (err) {
        setError('Failed to load detection');
      }
    };
    loadDetection();
  }, [id, fetchDetectionById, platformType]);

  /**
   * Handle detection content updates with validation
   */
  const handleSave = useCallback(async (updatedDetection: Detection) => {
    try {
      setIsSaving(true);
      const result = await updateDetection(id!, updatedDetection);
      if (result) {
        setDetection(result);
        // Validate after save
        handleValidate(result.id, platformType);
      }
    } catch (err) {
      setError('Failed to save detection');
    } finally {
      setIsSaving(false);
    }
  }, [id, updateDetection, platformType]);

  /**
   * Handle detection validation with performance monitoring
   */
  const handleValidate = useCallback(async (
    detectionId: string,
    platform: PlatformType
  ) => {
    try {
      const startTime = performance.now();
      const result = await validateDetection(detectionId, platform, {
        performanceCheck: true,
        mitreMappingValidation: true
      });

      const validationTime = performance.now() - startTime;
      const performanceImpact = validationTime > PERFORMANCE_THRESHOLD_MS
        ? PerformanceImpact.HIGH
        : PerformanceImpact.LOW;

      setValidationStatus({
        ...result,
        performanceImpact,
        validatedAt: new Date()
      });
    } catch (err) {
      setError('Validation failed');
    }
  }, [validateDetection]);

  /**
   * Memoized validation status display
   */
  const validationDisplay = useMemo(() => {
    if (!validationStatus) return null;

    const severityColor = {
      [DetectionSeverity.CRITICAL]: COLORS.error,
      [DetectionSeverity.HIGH]: '#ff9800',
      [DetectionSeverity.MEDIUM]: '#ff9800',
      [DetectionSeverity.LOW]: COLORS.success,
      [DetectionSeverity.INFO]: COLORS.primary
    };

    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" sx={headingStyles.h3}>
          Validation Results
        </Typography>
        {validationStatus.issues.map((issue, index) => (
          <Alert
            key={index}
            severity={issue.severity.toLowerCase() as any}
            sx={{ mt: 1, color: severityColor[issue.severity] }}
          >
            {issue.message}
            {issue.location && (
              <Typography variant="caption" display="block">
                Line {issue.location.line}, Column {issue.location.column}
              </Typography>
            )}
          </Alert>
        ))}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={4}>
            <Typography variant="body2" sx={bodyStyles.small}>
              Performance Impact: {validationStatus.performanceImpact}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" sx={bodyStyles.small}>
              False Positive Rate: {validationStatus.falsePositiveRate}%
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" sx={bodyStyles.small}>
              Last Validated: {new Date(validationStatus.validatedAt).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    );
  }, [validationStatus]);

  if (loading.detections) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || detectionError) {
    return (
      <Container>
        <Alert severity="error" sx={{ mt: 4 }}>
          {error || detectionError?.message}
        </Alert>
      </Container>
    );
  }

  if (!detection) {
    return (
      <Container>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Detection not found
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h4" sx={headingStyles.h2}>
            {detection.name}
          </Typography>
          <Typography variant="body1" sx={bodyStyles.medium}>
            {detection.description}
          </Typography>
        </Grid>

        <Grid item xs={12}>
          <Tabs value={selectedTab} onChange={(_, value) => setSelectedTab(value)}>
            <Tab label="Editor" id="detection-tab-0" />
            <Tab label="Validation" id="detection-tab-1" />
            <Tab label="History" id="detection-tab-2" />
          </Tabs>

          <TabPanel value={selectedTab} index={0}>
            <DetectionEditor
              detection={detection}
              platformType={platformType}
              onSave={handleSave}
              onValidate={(result) => setValidationStatus(result)}
              onError={(err) => setError(err.message)}
            />
          </TabPanel>

          <TabPanel value={selectedTab} index={1}>
            {validationDisplay}
          </TabPanel>

          <TabPanel value={selectedTab} index={2}>
            {/* History view implementation */}
          </TabPanel>
        </Grid>

        {isSaving && (
          <Alert severity="info" sx={{ position: 'fixed', bottom: 16, right: 16 }}>
            Saving changes...
          </Alert>
        )}
      </Grid>
    </Container>
  );
};

export default DetectionDetail;