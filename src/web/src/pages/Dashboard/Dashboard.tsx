import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  Grid,
  Container,
  Typography,
  Box,
  Skeleton,
  Alert
} from '@mui/material'; // v5.14+
import { useNavigate, useLocation } from 'react-router-dom'; // v6.4+

// Internal components and hooks
import DetectionCard from '../../components/detection/DetectionCard/DetectionCard';
import AnalyticsCard from '../../components/analytics/AnalyticsCard/AnalyticsCard';
import { useDetection } from '../../hooks/useDetection';
import { useSearch } from '../../hooks/useSearch';

// Types
import { Detection } from '../../types/detection.types';
import { PlatformType } from '../../types/platform.types';

/**
 * Interface for dashboard analytics state
 */
interface DashboardAnalytics {
  activeUsers: number;
  totalDetections: number;
  deploymentRate: number;
  accuracy: number;
}

/**
 * Main Dashboard component implementing the core layout structure
 * with featured detections, recent activity, and key statistics.
 */
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State management
  const [analytics, setAnalytics] = useState<DashboardAnalytics>({
    activeUsers: 0,
    totalDetections: 0,
    deploymentRate: 0,
    accuracy: 0
  });

  // Custom hooks
  const { 
    detections,
    fetchDetections,
    isLoading,
    error
  } = useDetection();

  const {
    results: searchResults,
    handleSearch,
    isLoading: isSearching
  } = useSearch();

  /**
   * Fetch initial dashboard data
   */
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch featured detections
      await fetchDetections();

      // Fetch analytics data
      // Note: In a real implementation, this would come from an analytics service
      setAnalytics({
        activeUsers: 1234,
        totalDetections: 10000,
        deploymentRate: 85,
        accuracy: 98
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [fetchDetections]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Memoized featured detections
   */
  const featuredDetections = useMemo(() => {
    return detections.slice(0, 3).map(detection => ({
      ...detection,
      isFeatured: true
    }));
  }, [detections]);

  /**
   * Handle detection card click navigation
   */
  const handleDetectionClick = useCallback((detection: Detection) => {
    navigate(`/detections/${detection.id}`, {
      state: { from: location.pathname }
    });
  }, [navigate, location]);

  /**
   * Handle search input changes
   */
  const handleSearchChange = useCallback((query: string) => {
    handleSearch(query);
  }, [handleSearch]);

  /**
   * Render loading skeleton
   */
  const renderSkeleton = () => (
    <Grid container spacing={3}>
      {[1, 2, 3].map((item) => (
        <Grid item xs={12} md={4} key={item}>
          <Skeleton variant="rectangular" height={200} />
        </Grid>
      ))}
    </Grid>
  );

  /**
   * Render error state
   */
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 3 }}>
          Failed to load dashboard data. Please try again later.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Dashboard Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Detection Platform
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Discover, share, and generate detection content
        </Typography>
      </Box>

      {/* Analytics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Active Users"
            value={analytics.activeUsers.toLocaleString()}
            trend={5.2}
            testId="analytics-active-users"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Total Detections"
            value={analytics.totalDetections.toLocaleString()}
            trend={12.5}
            testId="analytics-total-detections"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Deployment Rate"
            value={`${analytics.deploymentRate}%`}
            trend={-2.1}
            testId="analytics-deployment-rate"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <AnalyticsCard
            title="Detection Accuracy"
            value={`${analytics.accuracy}%`}
            trend={1.8}
            testId="analytics-accuracy"
          />
        </Grid>
      </Grid>

      {/* Featured Detections */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Featured Detections
        </Typography>
        {isLoading ? (
          renderSkeleton()
        ) : (
          <Grid container spacing={3}>
            {featuredDetections.map((detection) => (
              <Grid item xs={12} md={4} key={detection.id}>
                <DetectionCard
                  detection={detection}
                  viewMode="grid"
                  onEdit={() => handleDetectionClick(detection)}
                  testId={`featured-detection-${detection.id}`}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      {/* Recent Activity */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Recent Activity
        </Typography>
        {isLoading ? (
          renderSkeleton()
        ) : (
          <Grid container spacing={3}>
            {searchResults.slice(0, 3).map((detection) => (
              <Grid item xs={12} key={detection.id}>
                <DetectionCard
                  detection={detection}
                  viewMode="list"
                  onEdit={() => handleDetectionClick(detection)}
                  testId={`recent-detection-${detection.id}`}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Container>
  );
};

export default Dashboard;