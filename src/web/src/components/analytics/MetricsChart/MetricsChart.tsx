import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'; // v2.9+
import { Typography, Box, CircularProgress, useTheme, Skeleton } from '@mui/material'; // v5.14+
import debounce from 'lodash/debounce'; // v4.17+

import {
  ChartContainer,
  ChartHeader,
  ChartContent,
  ChartLegend,
  ChartTooltip,
  ChartLoadingOverlay
} from './MetricsChart.styles';
import { ApiResponse } from '../../../types/api.types';

// Chart type enumeration
export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  AREA = 'AREA',
  PIE = 'PIE',
  SCATTER = 'SCATTER',
  COMPOSED = 'COMPOSED'
}

// Interface for metric data points
export interface MetricData {
  name: string;
  value: number;
  category: string;
  timestamp: Date;
  unit?: string;
  metadata?: Record<string, any>;
  id: string;
}

// Interface for chart customization options
export interface ChartOptions {
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  gridConfig?: {
    strokeDasharray?: string;
    opacity?: number;
  };
  tooltipConfig?: {
    formatter?: (value: number, name: string) => string;
    labelFormatter?: (label: string) => string;
  };
  legendConfig?: {
    align?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
  };
  responsiveConfig?: {
    aspectRatio?: number;
    minHeight?: number;
  };
  themeConfig?: {
    fontFamily?: string;
    fontSize?: number;
  };
}

// Props interface for the MetricsChart component
export interface MetricsChartProps {
  title: string;
  data: MetricData[];
  type: ChartType;
  options?: ChartOptions;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onDataPointClick?: (data: MetricData) => void;
  animation?: {
    duration?: number;
    easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  };
  accessibility?: {
    ariaLabel?: string;
    role?: string;
  };
}

/**
 * MetricsChart Component
 * 
 * A comprehensive chart component for visualizing analytics metrics with support for
 * multiple chart types, responsive layouts, and theme integration.
 */
export const MetricsChart: React.FC<MetricsChartProps> = ({
  title,
  data,
  type,
  options = {},
  isLoading = false,
  isError = false,
  errorMessage = 'An error occurred while loading the chart data.',
  onDataPointClick,
  animation = { duration: 300, easing: 'ease-out' },
  accessibility = { ariaLabel: 'Metrics visualization chart', role: 'img' }
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Default chart colors from theme
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.error.main,
    theme.palette.success.main
  ];

  // Memoized chart data formatting
  const formattedData = useMemo(() => {
    if (!data?.length) return [];
    
    return data.map(item => ({
      ...item,
      timestamp: new Date(item.timestamp).toLocaleDateString(),
      value: Number(item.value.toFixed(2))
    }));
  }, [data]);

  // Responsive container size handler
  const updateDimensions = useCallback(
    debounce(() => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    }, 250),
    []
  );

  // Effect for handling window resize
  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Chart click handler
  const handleChartClick = useCallback((point: any) => {
    if (onDataPointClick && point?.payload) {
      onDataPointClick(point.payload);
    }
  }, [onDataPointClick]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <ChartTooltip>
        <Typography variant="subtitle2">{label}</Typography>
        {payload.map((entry: any, index: number) => (
          <Box key={index} sx={{ mt: 1 }}>
            <Typography variant="body2" color={entry.color}>
              {entry.name}: {entry.value}
              {data[0]?.unit ? ` ${data[0].unit}` : ''}
            </Typography>
          </Box>
        ))}
      </ChartTooltip>
    );
  };

  // Render appropriate chart type
  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 20, right: 30, left: 20, bottom: 20 },
      onClick: handleChartClick,
      animate: animation
    };

    switch (type) {
      case ChartType.LINE:
        return (
          <LineChart {...commonProps}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {options.showLegend && <Legend />}
            <Line
              type="monotone"
              dataKey="value"
              stroke={options.colors?.[0] || defaultColors[0]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case ChartType.BAR:
        return (
          <BarChart {...commonProps}>
            {options.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            {options.showLegend && <Legend />}
            <Bar
              dataKey="value"
              fill={options.colors?.[0] || defaultColors[0]}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      // Add other chart type implementations as needed

      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <ChartContainer>
        <ChartHeader>
          <Skeleton variant="text" width="40%" height={32} />
        </ChartHeader>
        <ChartContent>
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </ChartContent>
      </ChartContainer>
    );
  }

  // Error state
  if (isError) {
    return (
      <ChartContainer>
        <ChartHeader>
          <Typography variant="h6" color="error">{errorMessage}</Typography>
        </ChartHeader>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      ref={containerRef}
      role={accessibility.role}
      aria-label={accessibility.ariaLabel}
    >
      <ChartHeader>
        <Typography variant="h6" component="h2">{title}</Typography>
      </ChartHeader>
      <ChartContent>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </ChartContent>
      {options.showLegend && (
        <ChartLegend>
          {/* Custom legend implementation if needed */}
        </ChartLegend>
      )}
    </ChartContainer>
  );
};

export default MetricsChart;