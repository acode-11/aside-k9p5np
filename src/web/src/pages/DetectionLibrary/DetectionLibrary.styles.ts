import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Container, Paper } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../styles/theme.styles';

/**
 * Main container component for the Detection Library page
 * Implements responsive padding and full-width layout with performance optimizations
 */
export const LibraryContainer = styled(Container)`
  /* Base layout styles */
  padding: ${({ theme }) => theme.spacing(3)};
  max-width: 100%;
  min-height: 100vh;
  
  /* Performance optimizations */
  contain: layout style;
  will-change: padding;
  
  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    padding: ${({ theme }) => theme.spacing(2)};
  }
  
  /* Print optimization */
  @media print {
    padding: 0;
    min-height: auto;
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Sticky container for search and filter controls
 * Implements elevation and responsive spacing with accessibility considerations
 */
export const SearchContainer = styled(Paper)`
  /* Base container styles */
  ${containerStyles.card};
  position: sticky;
  top: 0;
  z-index: 1;
  padding: ${({ theme }) => theme.spacing(2)};
  margin-bottom: ${({ theme }) => theme.spacing(3)};
  
  /* Performance optimizations */
  contain: layout paint;
  will-change: transform;
  
  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    padding: ${({ theme }) => theme.spacing(1)};
    margin-bottom: ${({ theme }) => theme.spacing(2)};
  }
  
  /* Accessibility - Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    position: relative;
    transform: none;
  }
  
  /* Print optimization */
  @media print {
    display: none;
  }
`;

/**
 * Main content container for the detection list
 * Implements primary surface styling with minimum height requirements
 */
export const ContentContainer = styled(Box)`
  /* Base surface styles */
  ${surfaceStyles.primary};
  min-height: calc(100vh - 200px);
  padding: ${({ theme }) => theme.spacing(2)};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;
  
  /* Performance optimizations */
  contain: content;
  will-change: contents;
  
  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    min-height: calc(100vh - 160px);
    padding: ${({ theme }) => theme.spacing(1)};
  }
  
  /* Print optimization */
  @media print {
    min-height: auto;
    padding: 0;
    background: none;
  }
`;

/**
 * Flexible container for filter controls
 * Implements responsive gap spacing and wrapping behavior
 */
export const FilterContainer = styled(Box)`
  /* Base layout styles */
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
  margin: ${({ theme }) => theme.spacing(2)} 0;
  
  /* Performance optimizations */
  contain: layout style;
  will-change: gap;
  
  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    gap: ${({ theme }) => theme.spacing(1)};
    margin: ${({ theme }) => theme.spacing(1)} 0;
  }
  
  /* Print optimization */
  @media print {
    display: none;
  }
  
  /* High DPI screen optimizations */
  @media (min-resolution: 2dppx) {
    font-smoothing: antialiased;
    -webkit-font-smoothing: antialiased;
  }
`;

/**
 * Grid container for detection cards layout
 * Implements responsive grid with optimal sizing
 */
export const DetectionGrid = styled(Box)`
  /* Base grid layout */
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
  
  /* Performance optimizations */
  contain: layout style;
  will-change: grid-template-columns;
  
  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    grid-template-columns: 1fr;
    gap: ${({ theme }) => theme.spacing(2)};
  }
  
  ${responsiveStyles.tablet} {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
  
  /* Print optimization */
  @media print {
    display: block;
    
    & > * {
      margin-bottom: ${({ theme }) => theme.spacing(2)};
    }
  }
`;