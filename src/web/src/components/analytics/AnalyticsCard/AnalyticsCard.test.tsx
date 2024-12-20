import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'; // v14.0+
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'; // v29.0+
import userEvent from '@testing-library/user-event'; // v14.0+
import { ThemeProvider } from '@mui/material/styles'; // v5.14+
import { createTheme } from '@mui/material'; // v5.14+
import { axe, toHaveNoViolations } from 'jest-axe'; // v5.16+

import AnalyticsCard from './AnalyticsCard';
import { COLORS, TYPOGRAPHY, BREAKPOINTS } from '../../../constants/theme.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock theme for testing
const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary
    },
    error: {
      main: COLORS.error
    },
    success: {
      main: COLORS.success
    }
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary
  },
  breakpoints: {
    values: BREAKPOINTS.values
  }
});

// Custom render function with theme provider
const renderWithTheme = (ui: React.ReactNode, options = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>,
    options
  );
};

// Default test props
const defaultProps = {
  title: 'Total Detections',
  value: 1234,
  trend: 5.2,
  ariaLabel: 'Total detections analytics card',
  testId: 'analytics-card'
};

describe('AnalyticsCard Component', () => {
  // Reset any mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Props', () => {
    it('renders with required props', () => {
      renderWithTheme(<AnalyticsCard {...defaultProps} />);
      
      expect(screen.getByText('Total Detections')).toBeInTheDocument();
      expect(screen.getByText('1234')).toBeInTheDocument();
      expect(screen.getByText('+5.2%')).toBeInTheDocument();
    });

    it('applies correct typography styles', () => {
      renderWithTheme(<AnalyticsCard {...defaultProps} />);
      
      const title = screen.getByText('Total Detections');
      const value = screen.getByText('1234');
      
      expect(title).toHaveStyle({
        fontFamily: TYPOGRAPHY.fontFamily.primary,
        fontSize: TYPOGRAPHY.fontSize.lg
      });
      
      expect(value).toHaveStyle({
        fontFamily: TYPOGRAPHY.fontFamily.primary,
        fontSize: TYPOGRAPHY.fontSize.xxl
      });
    });

    it('handles empty or null values gracefully', () => {
      renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          value={0}
          trend={null}
        />
      );
      
      expect(screen.getByText('0')).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('maintains layout at different breakpoints', async () => {
      const { container } = renderWithTheme(<AnalyticsCard {...defaultProps} />);
      
      // Test mobile breakpoint
      window.resizeTo(BREAKPOINTS.mobile, 800);
      await waitFor(() => {
        expect(container.firstChild).toHaveStyle({
          minWidth: '100%'
        });
      });

      // Test desktop breakpoint
      window.resizeTo(BREAKPOINTS.desktop, 800);
      await waitFor(() => {
        expect(container.firstChild).toHaveStyle({
          minWidth: '300px'
        });
      });
    });
  });

  describe('Trend Indicators', () => {
    it('displays positive trend with correct color and icon', () => {
      renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          trend={10.5}
        />
      );
      
      const trendElement = screen.getByRole('status');
      expect(trendElement).toHaveStyle({
        color: COLORS.success
      });
      expect(trendElement).toHaveTextContent('+10.5%');
      expect(trendElement.querySelector('svg')).toBeInTheDocument();
    });

    it('displays negative trend with correct color and icon', () => {
      renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          trend={-8.3}
        />
      );
      
      const trendElement = screen.getByRole('status');
      expect(trendElement).toHaveStyle({
        color: COLORS.error
      });
      expect(trendElement).toHaveTextContent('-8.3%');
      expect(trendElement.querySelector('svg')).toBeInTheDocument();
    });

    it('handles zero trend value correctly', () => {
      renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          trend={0}
        />
      );
      
      const trendElement = screen.getByRole('status');
      expect(trendElement).toHaveTextContent('±0.0%');
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 requirements', async () => {
      const { container } = renderWithTheme(<AnalyticsCard {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation when clickable', () => {
      const handleClick = jest.fn();
      renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          onClick={handleClick}
        />
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
      
      // Test keyboard interaction
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalled();
      
      fireEvent.keyDown(card, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('provides correct ARIA labels', () => {
      renderWithTheme(<AnalyticsCard {...defaultProps} />);
      
      const card = screen.getByLabelText('Total detections analytics card');
      expect(card).toBeInTheDocument();
      
      const trend = screen.getByRole('status');
      expect(trend).toHaveAttribute('aria-label', 'Trend +5.2%');
    });
  });

  describe('Performance', () => {
    it('renders efficiently with large numbers', () => {
      const largeValue = 1000000;
      const { rerender } = renderWithTheme(
        <AnalyticsCard
          {...defaultProps}
          value={largeValue}
        />
      );
      
      // Test re-render with same value
      rerender(
        <ThemeProvider theme={theme}>
          <AnalyticsCard
            {...defaultProps}
            value={largeValue}
          />
        </ThemeProvider>
      );
      
      expect(screen.getByText('1000000')).toBeInTheDocument();
    });

    it('handles rapid trend updates smoothly', async () => {
      const { rerender } = renderWithTheme(<AnalyticsCard {...defaultProps} />);
      
      // Simulate rapid updates
      for (let i = 0; i < 5; i++) {
        rerender(
          <ThemeProvider theme={theme}>
            <AnalyticsCard
              {...defaultProps}
              trend={i * 2.5}
            />
          </ThemeProvider>
        );
      }
      
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('+10.0%');
      });
    });
  });
});