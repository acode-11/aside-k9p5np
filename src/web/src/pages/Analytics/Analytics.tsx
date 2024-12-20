import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Grid,
  Container,
  Typography,
  Box,
  CircularProgress,
  Skeleton
} from '@mui/material'; // v5.14+
import AnalyticsCard from '../../components/analytics/AnalyticsCard/AnalyticsCard';
import MetricsChart from '../../components/analytics/MetricsChart/MetricsChart';
import ApiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../constants/api.constants';
import { ChartType } from '../../components/analytics/MetricsChart/MetricsChart';
import { ApiError, ApiResponse } from '../../types/api.types';

// Interface for analytics metric data
interface MetricData {
  id: string;
  title: string;
  value: number;
  trend: number;
  category: string;
  status: 'success' | 'warning' | 'error';
  lastUpdated: Date;
}

// Interface for time-series chart data
interface ChartData {
  timestamp: Date;
  value: number;
  category: string;
  annotations?: Record<string, any>;
}

// Interface for filter options
interface FilterOptions {
  timeRange: string;
  category?: string;
  platform?: string;
}

/**
 * Analytics Dashboard Component
 * 
 * Displays platform performance metrics, usage statistics, and trends using
 * interactive charts and metric cards. Implements real-time updates and
 * comprehensive error handling.
 */
const Analytics: React.FC = () => {
  // State management for metrics and loading states
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState({
    metrics: true,
    chart: true
  });
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: '7d',
    category: 'all'
  });

  /**
   * Fetches current analytics metrics with error handling and caching
   */
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, metrics: true }));
      const response = await ApiService.get<ApiResponse<MetricData[]>>(
        API_ENDPOINTS.ANALYTICS.METRICS
      );
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message,
        code: apiError.code
      });
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  }, []);

  /**
   * Fetches time-series data with filtering and real-time updates
   */
  const fetchChartData = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, chart: true }));
      const response = await ApiService.get<ApiResponse<ChartData[]>>(
        `${API_ENDPOINTS.ANALYTICS.METRICS}/trend?timeRange=${filters.timeRange}`
      );
      setChartData(response.data);
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;
      setError({
        message: apiError.message,
        code: apiError.code
      });
    } finally {
      setLoading(prev => ({ ...prev, chart: false }));
    }
  }, [filters.timeRange]);

  // Initial data fetch
  useEffect(() => {
    fetchMetrics();
    fetchChartData();

    // Set up real-time updates
    const updateInterval = setInterval(() => {
      fetchMetrics();
      fetchChartData();
    }, 300000); // Update every 5 minutes

    return () => clearInterval(updateInterval);
  }, [fetchMetrics, fetchChartData]);

  // Memoized chart options
  const chartOptions = useMemo(() => ({
    colors: ['#1976D2', '#424242', '#D32F2F', '#388E3C'],
    showGrid: true,
    showLegend: true,
    xAxisLabel: 'Time',
    yAxisLabel: 'Value',
    gridConfig: {
      strokeDasharray: '3 3',
      opacity: 0.2
    },
    tooltipConfig: {
      formatter: (value: number) => `${value.toLocaleString()}`,
      labelFormatter: (label: string) => new Date(label).toLocaleDateString()
    },
    responsiveConfig: {
      aspectRatio: 2,
      minHeight: 300
    }
  }), []);

  // Handle metric card click
  const handleMetricClick = useCallback((metric: MetricData) => {
    setFilters(prev => ({
      ...prev,
      category: metric.category
    }));
  }, []);

  // Render loading skeleton
  if (loading.metrics && loading.chart) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Grid container spacing={3}>
            {[1, 2, 3, 4].map((item) => (
              <Grid item xs={12} sm={6} md={3} key={item}>
                <Skeleton variant="rectangular" height={180} />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Skeleton variant="rectangular" height={400} />
            </Grid>
          </Grid>
        </Box>
      </Container>
    );
  }

  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error" gutterBottom>
            {error.message}
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Error Code: {error.code}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Platform Analytics
        </Typography>

        {/* Metric Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {metrics.map((metric) => (
            <Grid item xs={12} sm={6} md={3} key={metric.id}>
              <AnalyticsCard
                title={metric.title}
                value={metric.value.toLocaleString()}
                trend={metric.trend}
                onClick={() => handleMetricClick(metric)}
                ariaLabel={`${metric.title} metric card`}
              />
            </Grid>
          ))}
        </Grid>

        {/* Trend Chart */}
        <Box sx={{ mt: 4 }}>
          <MetricsChart
            title="Performance Trends"
            data={chartData}
            type={ChartType.LINE}
            options={chartOptions}
            isLoading={loading.chart}
            onDataPointClick={(data) => console.log('Chart point clicked:', data)}
            accessibility={{
              ariaLabel: 'Performance metrics trend chart',
              role: 'img'
            }}
          />
        </Box>
      </Box>
    </Container>
  );
};

export default Analytics;