import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import MetricsChart, { ChartType, MetricData } from './MetricsChart';
import { COLORS, TYPOGRAPHY, BREAKPOINTS } from '../../../constants/theme.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock theme
const mockTheme = {
  palette: {
    primary: { main: COLORS.primary },
    secondary: { main: COLORS.secondary },
    error: { main: COLORS.error },
    success: { main: COLORS.success }
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary,
    h6: {
      fontSize: TYPOGRAPHY.fontSize.xl,
      fontWeight: TYPOGRAPHY.fontWeight.semibold
    }
  },
  breakpoints: {
    values: BREAKPOINTS.values
  }
};

// Mock data
const mockData: MetricData[] = [
  {
    id: '1',
    name: 'Detection Rate',
    value: 100,
    category: 'performance',
    timestamp: new Date('2023-01-01T00:00:00Z'),
    unit: '%'
  },
  {
    id: '2',
    name: 'Detection Rate',
    value: 150,
    category: 'performance',
    timestamp: new Date('2023-01-02T00:00:00Z'),
    unit: '%'
  }
];

// Test wrapper component
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

describe('MetricsChart Component', () => {
  // Mock handlers
  const mockDataPointClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the chart with title', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      expect(screen.getByText('Detection Metrics')).toBeInTheDocument();
      expect(screen.getByRole('img', { name: /metrics visualization chart/i })).toBeInTheDocument();
    });

    it('should render loading skeleton when isLoading is true', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
          isLoading={true}
        />
      );

      expect(screen.getByTestId('skeleton-title')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-chart')).toBeInTheDocument();
    });

    it('should render error message when isError is true', () => {
      const errorMessage = 'Failed to load chart data';
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
          isError={true}
          errorMessage={errorMessage}
        />
      );

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('should apply correct typography styles to title', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      const title = screen.getByText('Detection Metrics');
      expect(title).toHaveStyle({
        fontFamily: TYPOGRAPHY.fontFamily.primary,
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.semibold
      });
    });
  });

  describe('Chart Types', () => {
    it('should render line chart correctly', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      expect(screen.getByTestId('recharts-line')).toBeInTheDocument();
    });

    it('should render bar chart correctly', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.BAR}
        />
      );

      expect(screen.getByTestId('recharts-bar')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onDataPointClick when data point is clicked', async () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
          onDataPointClick={mockDataPointClick}
        />
      );

      const dataPoint = screen.getByTestId('recharts-line-dot');
      fireEvent.click(dataPoint);

      await waitFor(() => {
        expect(mockDataPointClick).toHaveBeenCalledWith(expect.objectContaining({
          id: mockData[0].id,
          value: mockData[0].value
        }));
      });
    });

    it('should show tooltip on hover', async () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      const dataPoint = screen.getByTestId('recharts-line-dot');
      fireEvent.mouseOver(dataPoint);

      await waitFor(() => {
        expect(screen.getByTestId('recharts-tooltip')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have correct ARIA attributes', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
          accessibility={{
            ariaLabel: 'Detection rate over time',
            role: 'img'
          }}
        />
      );

      const chart = screen.getByRole('img', { name: 'Detection rate over time' });
      expect(chart).toHaveAttribute('aria-label', 'Detection rate over time');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust dimensions on window resize', async () => {
      const { container } = renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={mockData}
          type={ChartType.LINE}
        />
      );

      // Mock window resize
      global.innerWidth = BREAKPOINTS.mobile;
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const chart = container.querySelector('.recharts-responsive-container');
        expect(chart).toHaveStyle({ width: '100%' });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', () => {
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={[]}
          type={ChartType.LINE}
        />
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('should handle invalid data points', () => {
      const invalidData = [...mockData, { ...mockData[0], value: NaN }];
      renderWithTheme(
        <MetricsChart
          title="Detection Metrics"
          data={invalidData}
          type={ChartType.LINE}
        />
      );

      expect(screen.queryByText('NaN')).not.toBeInTheDocument();
    });
  });
});