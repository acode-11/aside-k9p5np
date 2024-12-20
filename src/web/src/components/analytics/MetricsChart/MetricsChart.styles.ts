import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Paper } from '@mui/material'; // v5.14+
import { COLORS, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';
import { responsiveStyles } from '../../../styles/theme.styles';

/**
 * Main container wrapper for the metrics chart component
 * Implements Material-UI Paper component with responsive padding and elevation
 */
export const ChartContainer = styled(Paper)`
  width: 100%;
  height: 100%;
  min-height: 400px;
  padding: ${SPACING.base * 3}px;
  border-radius: var(--border-radius-md, 8px);
  background-color: var(--surface-background, ${COLORS.background.light});
  box-shadow: var(--elevation-low, 0 2px 4px rgba(0, 0, 0, 0.1));
  transition: box-shadow 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    padding: ${SPACING.base * 2}px;
    min-height: 300px;
  }

  ${responsiveStyles.tablet} {
    min-height: 350px;
  }

  &:hover {
    box-shadow: var(--elevation-medium, 0 4px 8px rgba(0, 0, 0, 0.1));
  }
`;

/**
 * Header section containing chart title and action buttons
 * Implements flexible layout with responsive spacing
 */
export const ChartHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.base * 3}px;
  min-height: 48px;

  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.base * 2}px;
    flex-direction: column;
    align-items: flex-start;
    gap: ${SPACING.base}px;
  }
`;

/**
 * Content wrapper for the chart visualization
 * Provides responsive height calculations and padding
 */
export const ChartContent = styled(Box)`
  width: 100%;
  height: calc(100% - 120px); // Account for header and legend
  position: relative;
  margin: ${SPACING.base * 2}px 0;

  ${responsiveStyles.mobile} {
    height: calc(100% - 140px); // Adjusted for stacked header
    margin: ${SPACING.base}px 0;
  }

  // High DPI screen optimizations
  @media (min-resolution: 2dppx) {
    canvas {
      image-rendering: crisp-edges;
      -webkit-font-smoothing: antialiased;
    }
  }
`;

/**
 * Legend container with series information
 * Implements wrap-enabled flex layout with responsive spacing
 */
export const ChartLegend = styled(Box)`
  display: flex;
  flex-wrap: wrap;
  gap: ${SPACING.base}px;
  align-items: center;
  min-height: 32px;
  margin-top: ${SPACING.base * 2}px;

  ${responsiveStyles.mobile} {
    margin-top: ${SPACING.base}px;
    gap: ${SPACING.base / 2}px;
  }
`;

/**
 * Chart tooltip container with elevation and theme-aware colors
 */
export const ChartTooltip = styled(Box)`
  padding: ${SPACING.base * 1.5}px;
  background-color: var(--surface-background, ${COLORS.background.light});
  border-radius: var(--border-radius-sm, 4px);
  box-shadow: var(--elevation-medium, 0 4px 8px rgba(0, 0, 0, 0.1));
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  
  // Print optimization
  @media print {
    box-shadow: none;
    border: 1px solid #000;
  }
`;

/**
 * Loading overlay for chart data fetching states
 */
export const ChartLoadingOverlay = styled(Box)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--overlay-background, rgba(255, 255, 255, 0.8));
  z-index: 1;
  
  ${responsiveStyles.reducedMotion} {
    .loading-spinner {
      animation: none;
    }
  }
`;