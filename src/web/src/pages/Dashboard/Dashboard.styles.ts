import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Container, Grid, Typography } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../styles/theme.styles';

/**
 * Main dashboard container with responsive padding and max-width constraint
 * Implements containment optimization for performance
 */
export const DashboardContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: '1440px',
  margin: '0 auto',
  contain: 'content',
  direction: 'ltr',

  // Responsive padding adjustments
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },

  [theme.breakpoints.up('lg')]: {
    padding: theme.spacing(4),
  },

  // Print optimization
  '@media print': {
    padding: theme.spacing(0),
    maxWidth: 'none',
  }
}));

/**
 * Grid container for metrics cards with responsive spacing
 * Uses CSS Grid for optimal layout performance
 */
export const MetricsGrid = styled(Grid)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: theme.spacing(3),
  marginBottom: theme.spacing(4),
  transition: 'gap 0.2s ease-in-out',
  contain: 'layout style',

  // Responsive adjustments
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(2),
    gridTemplateColumns: '1fr',
  },

  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(3, 1fr)',
  },

  // Container styles integration
  '& > .MuiGrid-item': {
    ...containerStyles.card,
    height: '100%',
    minHeight: '160px',
    display: 'flex',
    flexDirection: 'column',
  }
}));

/**
 * Grid container for detection cards with dynamic gap sizing
 * Implements virtualization-friendly layout
 */
export const DetectionGrid = styled(Grid)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  gap: theme.spacing(3),
  marginTop: theme.spacing(4),
  transition: 'all 0.3s ease-in-out',
  contain: 'layout style',

  // Responsive adjustments
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(2),
    gridTemplateColumns: '1fr',
  },

  // Container styles integration
  '& > .MuiGrid-item': {
    ...containerStyles.cardInteractive,
    height: '100%',
    minHeight: '200px',
  },

  // Surface styles for featured items
  '& .featured': {
    ...surfaceStyles.primary,
  }
}));

/**
 * Section title typography with responsive font scaling
 * Implements optimal text rendering
 */
export const SectionTitle = styled(Typography)(({ theme }) => ({
  ...theme.typography.h6,
  marginBottom: theme.spacing(2),
  fontWeight: 500,
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
  contain: 'style',

  // Responsive font scaling
  [theme.breakpoints.up('sm')]: {
    ...theme.typography.h5,
  },

  [theme.breakpoints.up('md')]: {
    marginBottom: theme.spacing(3),
  },

  // High DPI optimization
  '@media (min-resolution: 2dppx)': {
    textRendering: 'optimizeLegibility',
    '-webkit-font-smoothing': 'antialiased',
    '-moz-osx-font-smoothing': 'grayscale',
  }
}));

/**
 * Activity feed container with scrollable content
 * Implements performance optimizations for long lists
 */
export const ActivityFeed = styled(Box)(({ theme }) => ({
  ...containerStyles.card,
  maxHeight: '400px',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  contain: 'strict',
  
  // Scrollbar styling
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.divider,
    borderRadius: '4px',
  },

  // Reduced motion support
  '@media (prefers-reduced-motion: reduce)': {
    scrollBehavior: 'auto',
  }
}));

/**
 * Statistics card with enhanced interaction states
 * Implements surface styles for emphasis
 */
export const StatsCard = styled(Box)(({ theme }) => ({
  ...containerStyles.cardInteractive,
  ...surfaceStyles.primary,
  padding: theme.spacing(3),
  color: theme.palette.primary.contrastText,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),

  // Mobile optimization
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
    ...responsiveStyles.mobile,
  },

  // Print optimization
  '@media print': {
    breakInside: 'avoid',
    color: 'black',
  }
}));