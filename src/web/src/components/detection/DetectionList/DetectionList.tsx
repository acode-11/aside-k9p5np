import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Grid,
  Box,
  Typography,
  CircularProgress,
  Pagination,
  Skeleton,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material'; // v5.14+
import {
  ViewModule,
  ViewList,
  ViewCompact
} from '@mui/icons-material'; // v5.14+
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { useInView } from 'react-intersection-observer'; // v9.5.2

import DetectionCard from '../DetectionCard/DetectionCard';
import { Detection } from '../../../types/detection.types';
import { useDetection } from '../../../hooks/useDetection';
import { containerStyles, responsiveStyles } from '../../../styles/theme.styles';
import { BREAKPOINTS, SPACING } from '../../../constants/theme.constants';

// Props interface with comprehensive options
interface DetectionListProps {
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  viewMode: 'grid' | 'list' | 'compact';
  onFilterChange?: (filters: Record<string, any>) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  enableBulkOperations?: boolean;
  virtualizeList?: boolean;
  pageSize?: number;
  testId?: string;
}

/**
 * DetectionList component that renders a virtualized list of detection cards
 * with support for different view modes, bulk operations, and enhanced error handling.
 */
export const DetectionList: React.FC<DetectionListProps> = ({
  filters,
  sortBy,
  sortOrder = 'desc',
  viewMode,
  onFilterChange,
  onSortChange,
  onSelectionChange,
  enableBulkOperations = false,
  virtualizeList = true,
  pageSize = 20,
  testId = 'detection-list'
}) => {
  // Theme and responsive hooks
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // State management
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  // Custom hooks
  const {
    detections,
    loading,
    error,
    fetchDetections,
    validateDetection,
    deployDetection
  } = useDetection();

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true
  });

  // Memoized calculations
  const itemSize = useMemo(() => {
    switch (viewMode) {
      case 'compact':
        return 100;
      case 'list':
        return 200;
      case 'grid':
        return isMobile ? 300 : isTablet ? 350 : 400;
      default:
        return 200;
    }
  }, [viewMode, isMobile, isTablet]);

  // Virtualization configuration
  const virtualizer = useVirtualizer({
    count: detections.length,
    getScrollElement: () => containerRef,
    estimateSize: () => itemSize,
    overscan: 5
  });

  // Effect to fetch detections on mount and filter changes
  useEffect(() => {
    const fetchData = async () => {
      await fetchDetections({
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder,
        ...filters
      });
    };
    fetchData();
  }, [currentPage, pageSize, sortBy, sortOrder, filters, fetchDetections]);

  // Load more data when scrolling
  useEffect(() => {
    if (inView && !loading.detections) {
      setCurrentPage(prev => prev + 1);
    }
  }, [inView, loading.detections]);

  // Handlers
  const handleViewModeChange = useCallback((
    _: React.MouseEvent<HTMLElement>,
    newMode: 'grid' | 'list' | 'compact'
  ) => {
    if (newMode) {
      onFilterChange?.({ ...filters, viewMode: newMode });
    }
  }, [filters, onFilterChange]);

  const handleSelectionChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const newIds = selected
        ? [...prev, id]
        : prev.filter(prevId => prevId !== id);
      onSelectionChange?.(newIds);
      return newIds;
    });
  }, [onSelectionChange]);

  const handleBulkOperation = useCallback(async (operation: string) => {
    if (!selectedIds.length) return;

    try {
      switch (operation) {
        case 'validate':
          await Promise.all(
            selectedIds.map(id => validateDetection(id, 'SIEM'))
          );
          break;
        case 'deploy':
          await Promise.all(
            selectedIds.map(id => deployDetection(id, 'SIEM'))
          );
          break;
        default:
          console.warn('Unknown bulk operation:', operation);
      }
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  }, [selectedIds, validateDetection, deployDetection]);

  // Render functions
  const renderError = () => (
    <Alert 
      severity="error" 
      sx={{ margin: theme.spacing(2) }}
      data-testid={`${testId}-error`}
    >
      {error?.message || 'An error occurred while loading detections'}
    </Alert>
  );

  const renderLoading = () => (
    <Box sx={{ padding: theme.spacing(2) }}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton
          key={index}
          variant="rectangular"
          height={itemSize}
          sx={{ marginBottom: theme.spacing(2) }}
          data-testid={`${testId}-loading-${index}`}
        />
      ))}
    </Box>
  );

  const renderDetectionCard = (detection: Detection) => (
    <DetectionCard
      key={detection.id}
      detection={detection}
      viewMode={viewMode}
      onEdit={() => {/* Handle edit */}}
      onDelete={() => {/* Handle delete */}}
      onDeploy={() => handleBulkOperation('deploy')}
      className={selectedIds.includes(detection.id) ? 'selected' : ''}
      testId={`${testId}-card-${detection.id}`}
    />
  );

  const renderVirtualizedList = () => {
    const items = virtualizer.getVirtualItems();

    return (
      <Box
        ref={setContainerRef}
        sx={{
          height: '100%',
          overflow: 'auto',
          position: 'relative',
          ...containerStyles.card
        }}
        data-testid={`${testId}-container`}
      >
        <Box
          sx={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative'
          }}
        >
          {items.map(virtualRow => (
            <Box
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              {renderDetectionCard(detections[virtualRow.index])}
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        gap: theme.spacing(2)
      }}
      data-testid={testId}
    >
      {/* Header controls */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing(2)
        }}
      >
        <Typography variant="h6" component="h2">
          Detection Library
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          aria-label="view mode"
        >
          <ToggleButton value="grid" aria-label="grid view">
            <ViewModule />
          </ToggleButton>
          <ToggleButton value="list" aria-label="list view">
            <ViewList />
          </ToggleButton>
          <ToggleButton value="compact" aria-label="compact view">
            <ViewCompact />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Error state */}
      {error && renderError()}

      {/* Loading state */}
      {loading.detections && !detections.length && renderLoading()}

      {/* Detection list */}
      {!loading.detections && !error && (
        virtualizeList ? renderVirtualizedList() : (
          <Grid container spacing={2} sx={{ padding: theme.spacing(2) }}>
            {detections.map(detection => (
              <Grid
                key={detection.id}
                item
                xs={12}
                sm={viewMode === 'grid' ? 6 : 12}
                md={viewMode === 'grid' ? 4 : 12}
              >
                {renderDetectionCard(detection)}
              </Grid>
            ))}
          </Grid>
        )
      )}

      {/* Load more trigger */}
      <Box ref={loadMoreRef} sx={{ height: 20 }} />

      {/* Bulk operations */}
      {enableBulkOperations && selectedIds.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: theme.spacing(2),
            backgroundColor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            zIndex: theme.zIndex.appBar
          }}
        >
          <Typography variant="subtitle1">
            {selectedIds.length} items selected
          </Typography>
          {/* Add bulk operation buttons here */}
        </Box>
      )}
    </Box>
  );
};

export default DetectionList;