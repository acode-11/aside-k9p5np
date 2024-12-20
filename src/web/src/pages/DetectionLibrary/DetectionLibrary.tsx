import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material'; // v5.14+
import {
  Add as AddIcon,
  FilterList as FilterListIcon,
  Error as ErrorIcon
} from '@mui/icons-material'; // v5.14+
import { useNavigate, useLocation } from 'react-router-dom'; // v6.0+

// Internal components
import DetectionList from '../../components/detection/DetectionList/DetectionList';
import GlobalSearch from '../../components/common/GlobalSearch/GlobalSearch';
import PlatformSelector from '../../components/detection/PlatformSelector/PlatformSelector';

// Hooks and services
import { useDetection } from '../../hooks/useDetection';
import { Detection } from '../../types/detection.types';
import { PlatformType } from '../../types/platform.types';

// Constants for component configuration
const SEARCH_DEBOUNCE_DELAY = 300;
const DEFAULT_PAGE_SIZE = 20;

interface DetectionFilters {
  query: string;
  platforms: PlatformType[];
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * DetectionLibrary component implementing the main detection management interface
 * with comprehensive search, filtering, and management capabilities.
 */
const DetectionLibrary: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [filters, setFilters] = useState<DetectionFilters>({
    query: '',
    platforms: [],
    tags: [],
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });

  // Custom hooks
  const {
    detections,
    loading,
    error,
    fetchDetections,
    validateDetection,
    deployDetection
  } = useDetection();

  // Memoized view mode based on screen size
  const viewMode = useMemo(() => 
    isMobile ? 'list' : 'grid'
  , [isMobile]);

  /**
   * Handles search query updates with debouncing
   */
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({ ...prev, query }));
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('q', query);
    navigate({ search: searchParams.toString() }, { replace: true });
  }, [navigate, location]);

  /**
   * Handles platform filter changes with validation
   */
  const handlePlatformChange = useCallback((platforms: PlatformType[]) => {
    setFilters(prev => ({ ...prev, platforms }));
  }, []);

  /**
   * Handles detection selection for operations
   */
  const handleDetectionSelect = useCallback((detection: Detection) => {
    navigate(`/detections/${detection.id}`);
  }, [navigate]);

  /**
   * Handles new detection creation
   */
  const handleCreateDetection = useCallback(() => {
    navigate('/detections/new');
  }, [navigate]);

  /**
   * Handles bulk operations on selected detections
   */
  const handleBulkOperation = useCallback(async (operation: string, selectedIds: string[]) => {
    try {
      switch (operation) {
        case 'validate':
          await Promise.all(selectedIds.map(id => validateDetection(id, 'SIEM')));
          break;
        case 'deploy':
          await Promise.all(selectedIds.map(id => deployDetection(id, 'SIEM')));
          break;
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  }, [validateDetection, deployDetection]);

  // Effect to initialize filters from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryParam = searchParams.get('q') || '';
    setFilters(prev => ({ ...prev, query: queryParam }));
  }, [location]);

  // Effect to fetch detections when filters change
  useEffect(() => {
    fetchDetections(filters);
  }, [filters, fetchDetections]);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Detection Library
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleCreateDetection}
          aria-label="Create new detection"
        >
          New Detection
        </Button>
      </Box>

      {/* Search and Filter Section */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <GlobalSearch
          onResultSelect={handleDetectionSelect}
          placeholder="Search detections..."
          debounceDelay={SEARCH_DEBOUNCE_DELAY}
        />
        <PlatformSelector
          selectedPlatform={filters.platforms[0]}
          onPlatformChange={(platform) => handlePlatformChange([platform])}
          aria-label="Filter by platform"
        />
        <IconButton
          aria-label="More filters"
          onClick={() => {/* Handle additional filters */}}
        >
          <FilterListIcon />
        </IconButton>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Error Display */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={() => fetchDetections(filters)}>
              Retry
            </Button>
          }
        >
          {error.message || 'An error occurred while loading detections'}
        </Alert>
      )}

      {/* Loading State */}
      {loading.detections && !detections.length && (
        <Box sx={{ mt: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              variant="rectangular"
              height={200}
              sx={{ mb: 2, borderRadius: 1 }}
            />
          ))}
        </Box>
      )}

      {/* Detection List */}
      {!loading.detections && !error && (
        <DetectionList
          detections={detections}
          viewMode={viewMode}
          onSelectionChange={(selectedIds) => {/* Handle selection */}}
          enableBulkOperations
          virtualizeList={!isMobile}
          pageSize={DEFAULT_PAGE_SIZE}
          testId="detection-library-list"
        />
      )}
    </Container>
  );
};

export default DetectionLibrary;