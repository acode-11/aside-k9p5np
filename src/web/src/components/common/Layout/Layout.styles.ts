import { styled } from '@mui/material/styles';  // @mui/material v5.14+
import Box from '@mui/material/Box';  // @mui/material v5.14+
import { BREAKPOINTS, SPACING, ELEVATION, COLORS, TRANSITIONS } from '../../../constants/theme.constants';

// Global layout constants
const SIDEBAR_WIDTH = 240;
const APPBAR_HEIGHT = 64;
const TRANSITION_DURATION = '0.2s';
const Z_INDEX_SIDEBAR = 1200;

/**
 * Creates responsive styles with proper breakpoint management
 * @param breakpoint - Target breakpoint key
 * @param styles - CSS styles to apply
 * @returns Media query string with browser optimizations
 */
const createResponsiveStyles = (breakpoint: keyof typeof BREAKPOINTS) => {
  const breakpointValue = BREAKPOINTS[breakpoint];
  return `@media (min-width: ${breakpointValue}px)`;
};

/**
 * Root layout container component
 * Implements full viewport height with flex column layout
 */
export const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  willChange: 'contents',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
}));

/**
 * Main layout container component
 * Provides flex layout structure with proper spacing
 */
export const LayoutContainer = styled(Box)({
  display: 'flex',
  flex: 1,
  position: 'relative',
  paddingTop: APPBAR_HEIGHT,
  overflowX: 'hidden',
  willChange: 'padding-left',
});

/**
 * Main content area component
 * Implements responsive padding and smooth transitions
 */
export const MainContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: SPACING.scale[4],
  transition: `margin ${TRANSITION_DURATION} ease-in-out`,
  willChange: 'margin-left',

  // Desktop styles
  [createResponsiveStyles('desktop')]: {
    marginLeft: SIDEBAR_WIDTH,
    padding: SPACING.scale[4],
  },

  // Tablet styles
  [createResponsiveStyles('tablet')]: {
    padding: SPACING.scale[3],
  },

  // Mobile styles
  [createResponsiveStyles('mobile')]: {
    padding: SPACING.scale[2],
    marginLeft: 0,
  },

  // Reduced motion preference
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

/**
 * Sidebar wrapper component
 * Provides enhanced animation and elevation with responsive behavior
 */
export const SidebarWrapper = styled(Box)<{ open?: boolean }>(({ theme, open }) => ({
  width: SIDEBAR_WIDTH,
  position: 'fixed',
  top: APPBAR_HEIGHT,
  bottom: 0,
  left: 0,
  zIndex: Z_INDEX_SIDEBAR,
  backgroundColor: theme.palette.background.paper,
  boxShadow: ELEVATION.levels.medium,
  transition: `transform ${TRANSITION_DURATION} ease-in-out`,
  willChange: 'transform',
  
  // Mobile styles with slide animation
  [createResponsiveStyles('mobile')]: {
    transform: `translateX(${open ? 0 : -SIDEBAR_WIDTH}px)`,
  },

  // Reduced motion preference
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },

  // Hardware acceleration for smooth animations
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
}));