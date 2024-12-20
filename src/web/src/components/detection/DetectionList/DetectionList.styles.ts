import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Grid } from '@mui/material'; // v5.14+
import { containerStyles, responsiveStyles } from '../../../styles/theme.styles';

/**
 * Container component for the detection list with responsive layout and accessibility
 * Implements spacing scale and motion preferences from design system
 */
export const DetectionListContainer = styled(Box)`
  /* Base container styles */
  width: 100%;
  min-height: 200px;
  padding: ${({ theme }) => theme.spacing(3)};
  
  /* Responsive padding adjustments */
  ${responsiveStyles.mobile} {
    padding: ${({ theme }) => theme.spacing(2)};
  }

  /* Accessibility - Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    * {
      transition: none !important;
      animation: none !important;
    }
  }

  /* Print optimization */
  ${responsiveStyles.print} {
    padding: 0;
    width: 100%;
  }
`;

/**
 * Grid layout component for card view mode
 * Implements responsive column sizing and gap spacing based on breakpoints
 */
export const DetectionGrid = styled(Grid)`
  /* Base grid layout */
  display: grid;
  gap: ${({ theme }) => theme.spacing(3)};
  width: 100%;
  
  /* Responsive grid columns */
  ${responsiveStyles.mobile} {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing(2)};
  }
  
  ${responsiveStyles.tablet} {
    grid-template-columns: repeat(2, 1fr);
  }
  
  ${responsiveStyles.desktop} {
    grid-template-columns: repeat(3, 1fr);
  }

  /* Fallback for browsers without CSS Grid support */
  @supports not (display: grid) {
    display: flex;
    flex-wrap: wrap;
    margin: calc(-1 * ${({ theme }) => theme.spacing(1.5)});
    
    > * {
      flex: 1 1 300px;
      margin: ${({ theme }) => theme.spacing(1.5)};
    }
  }

  /* High DPI screen optimizations */
  @media (min-resolution: 2dppx) {
    transform: translateZ(0);
    backface-visibility: hidden;
  }
`;

/**
 * List item component for list view mode
 * Implements card container styles with enhanced interaction states
 */
export const DetectionListItem = styled(Box)`
  /* Base card styles from design system */
  ${containerStyles.card};
  
  /* Spacing and layout */
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  width: 100%;
  
  /* Interactive states with smooth transitions */
  transition: transform 0.2s ease-in-out,
              box-shadow 0.2s ease-in-out;
  
  &:hover, &:focus-visible {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows[2]};
  }

  /* Keyboard focus styles */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: 2px;
  }

  /* Touch device optimizations */
  @media (hover: none) {
    &:hover {
      transform: none;
    }
  }

  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    margin-bottom: ${({ theme }) => theme.spacing(1.5)};
  }

  /* Reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    
    &:hover, &:focus-visible {
      transform: none;
    }
  }
`;

/**
 * Empty state container for when no detections are present
 * Implements centered layout with responsive spacing
 */
export const EmptyStateContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 300px;
  padding: ${({ theme }) => theme.spacing(4)};
  
  ${responsiveStyles.mobile} {
    min-height: 200px;
    padding: ${({ theme }) => theme.spacing(3)};
  }
`;

/**
 * Loading state skeleton container
 * Implements responsive grid layout matching detection items
 */
export const LoadingContainer = styled(Box)`
  display: grid;
  gap: ${({ theme }) => theme.spacing(3)};
  width: 100%;
  
  ${responsiveStyles.mobile} {
    gap: ${({ theme }) => theme.spacing(2)};
  }
`;

/**
 * Error state container for displaying error messages
 * Implements alert styling with appropriate spacing
 */
export const ErrorContainer = styled(Box)`
  ${containerStyles.card};
  border-left: 4px solid ${({ theme }) => theme.palette.error.main};
  margin: ${({ theme }) => theme.spacing(2)} 0;
  padding: ${({ theme }) => theme.spacing(2, 3)};
`;