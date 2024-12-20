import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Grid, Container } from '@mui/material'; // v5.14+
import { containerStyles, responsiveStyles } from '../../styles/theme.styles';
import { SPACING, BREAKPOINTS } from '../../constants/theme.constants';

/**
 * Main container wrapper for analytics page with responsive padding
 * and full-width layout support
 */
export const AnalyticsContainer = styled(Container)`
  padding: ${SPACING.base * 3}px;
  max-width: 100%;
  min-height: calc(100vh - 64px); // Account for app bar height
  
  ${responsiveStyles.mobile} {
    padding: ${SPACING.base * 2}px;
  }
`;

/**
 * Responsive grid layout for analytics content using CSS Grid
 * with auto-fit columns and consistent gap spacing
 */
export const AnalyticsGrid = styled(Grid)`
  display: grid;
  gap: ${SPACING.base * 3}px;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  margin-top: ${SPACING.base * 3}px;
  
  ${responsiveStyles.mobile} {
    gap: ${SPACING.base * 2}px;
    margin-top: ${SPACING.base * 2}px;
    grid-template-columns: 1fr; // Stack cards on mobile
  }

  ${responsiveStyles.tablet} {
    grid-template-columns: repeat(2, 1fr); // 2 columns on tablet
  }

  ${responsiveStyles.desktop} {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); // Dynamic columns on desktop
  }
`;

/**
 * Section wrapper for grouped analytics content with consistent margins
 * and responsive spacing adjustments
 */
export const AnalyticsSection = styled(Box)`
  margin-bottom: ${SPACING.base * 4}px;
  
  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.base * 3}px;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

/**
 * Header section containing title and controls with responsive layout
 * and proper alignment across breakpoints
 */
export const AnalyticsHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${SPACING.base * 3}px;
  flex-wrap: wrap;
  gap: ${SPACING.base * 2}px;
  
  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.base * 2}px;
    flex-direction: column;
    align-items: flex-start;
  }
`;

/**
 * Card container for analytics widgets with elevation and hover effects
 * Extends Material-UI's interactive card styles
 */
export const AnalyticsCard = styled(Box)`
  ${containerStyles.cardInteractive};
  height: 100%;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  
  ${responsiveStyles.mobile} {
    min-height: 180px;
  }
`;

/**
 * Filters section with responsive layout and proper spacing
 * for filter controls and chips
 */
export const AnalyticsFilters = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${SPACING.base * 2}px;
  margin-bottom: ${SPACING.base * 3}px;
  flex-wrap: wrap;
  
  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.base * 2}px;
    flex-direction: column;
    align-items: flex-start;
  }
`;

/**
 * Container for chart/visualization components with proper aspect ratio
 * and responsive sizing
 */
export const ChartContainer = styled(Box)`
  width: 100%;
  height: 100%;
  min-height: 300px;
  position: relative;
  
  ${responsiveStyles.mobile} {
    min-height: 250px;
  }

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;