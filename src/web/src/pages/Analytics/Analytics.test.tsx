import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Analytics from './Analytics';
import { ApiService } from '../../services/api.service';
import { ApiResponse, ApiErrorCode } from '../../types/api.types';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../styles/theme';

// Extend expect for accessibility testing
expect.extend(toHaveNoViolations);

// Mock API service
vi.mock('../../services/api.service', () => ({
  get: vi.fn(),
  post: vi.fn()
}));

// Mock chart component to avoid rendering issues in tests
vi.mock('../../components/analytics/MetricsChart/MetricsChart', () => ({
  default: ({ title, data, onDataPointClick }: any) => (
    <div data-testid="metrics-chart">
      <h3>{title}</h3>
      <div data-testid="chart-data">{JSON.stringify(data)}</div>
      <button onClick={() => onDataPointClick(data[0])}>Click Data Point</button>
    </div>
  )
}));

// Mock metrics data generator
const mockMetricsData = () => ({
  data: [
    {
      id: '1',
      title: 'Active Users',
      value: 100000,
      trend: 25,
      category: 'adoption',
      status: 'success',
      lastUpdated: new Date()
    },
    {
      id: '2',
      title: 'Public Detections',
      value: 10000,
      trend: 15,
      category: 'content',
      status: 'success',
      lastUpdated: new Date()
    },
    {
      id: '3',
      title: 'Detection Accuracy',
      value: 99,
      trend: 5,
      category: 'quality',
      status: 'success',
      lastUpdated: new Date()
    },
    {
      id: '4',
      title: 'Platform Uptime',
      value: 99.9,
      trend: 0.1,
      category: 'performance',
      status: 'success',
      lastUpdated: new Date()
    }
  ],
  status: 200,
  message: 'Success',
  metadata: {}
});

// Mock chart data generator
const mockChartData = () => ({
  data: Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    value: Math.random() * 1000,
    category: 'users',
    id: `data-${i}`
  })),
  status: 200,
  message: 'Success',
  metadata: {}
});

describe('Analytics Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup successful API responses
    (ApiService.get as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('metrics')) {
        return Promise.resolve(mockMetricsData());
      }
      if (url.includes('trend')) {
        return Promise.resolve(mockChartData());
      }
      return Promise.reject(new Error('Invalid URL'));
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    // Verify loading skeletons are present
    expect(screen.getAllByTestId('skeleton')).toHaveLength(5); // 4 metric cards + 1 chart
    expect(screen.getByTestId('loading-container')).toBeInTheDocument();
  });

  it('displays metrics cards with correct data', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    // Wait for metrics to load
    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    // Verify all metric cards are rendered with correct data
    const metrics = mockMetricsData().data;
    metrics.forEach(metric => {
      const card = screen.getByText(metric.title).closest('[data-testid="analytics-card"]');
      expect(card).toBeInTheDocument();
      expect(within(card!).getByText(metric.value.toLocaleString())).toBeInTheDocument();
      expect(within(card!).getByText(`${metric.trend}%`)).toBeInTheDocument();
    });
  });

  it('handles metric card click interactions', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    // Click a metric card
    const card = screen.getByText('Active Users').closest('[data-testid="analytics-card"]');
    fireEvent.click(card!);

    // Verify filter update
    expect(ApiService.get).toHaveBeenCalledWith(
      expect.stringContaining('category=adoption')
    );
  });

  it('displays chart with correct data', async () => {
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-chart')).toBeInTheDocument();
    });

    // Verify chart title and data
    expect(screen.getByText('Performance Trends')).toBeInTheDocument();
    const chartData = JSON.parse(screen.getByTestId('chart-data').textContent!);
    expect(chartData).toHaveLength(30);
  });

  it('handles chart data point clicks', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-chart')).toBeInTheDocument();
    });

    // Click a chart data point
    fireEvent.click(screen.getByText('Click Data Point'));
    
    // Verify console log
    expect(consoleSpy).toHaveBeenCalledWith('Chart point clicked:', expect.any(Object));
  });

  it('handles API errors gracefully', async () => {
    // Mock API error
    (ApiService.get as jest.Mock).mockRejectedValue({
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to fetch metrics'
    });

    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    // Verify error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch metrics')).toBeInTheDocument();
    });
  });

  it('updates data periodically', async () => {
    vi.useFakeTimers();
    
    render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-chart')).toBeInTheDocument();
    });

    // Fast-forward 5 minutes
    vi.advanceTimersByTime(300000);

    // Verify API calls were made again
    expect(ApiService.get).toHaveBeenCalledTimes(4); // Initial + refresh calls
    
    vi.useRealTimers();
  });

  it('meets accessibility requirements', async () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <Analytics />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('metrics-chart')).toBeInTheDocument();
    });

    // Run accessibility tests
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});