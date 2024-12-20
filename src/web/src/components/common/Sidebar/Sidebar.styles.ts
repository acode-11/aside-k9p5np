import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Drawer } from '@mui/material'; // v5.14+
import { COLORS, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';
import { containerStyles, responsiveStyles } from '../../../styles/theme.styles';

// Core sidebar dimensions and animation timing
export const SIDEBAR_WIDTH = 240; // Default expanded width
export const COLLAPSED_WIDTH = 64; // Width when collapsed
export const TRANSITION_DURATION = 225; // Match Material-UI's transition duration
export const SIDEBAR_Z_INDEX = 1200; // Align with Material-UI's drawer z-index

/**
 * Creates responsive styles for sidebar based on breakpoint with theme integration
 * @param breakpoint - Breakpoint to target
 * @param isCollapsed - Whether sidebar is in collapsed state
 * @param theme - Material-UI theme object
 * @returns CSS media query styles with theme values
 */
const createResponsiveStyles = (breakpoint: number, isCollapsed: boolean, theme: any) => `
  @media (min-width: ${breakpoint}px) {
    width: ${isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH}px;
    ${theme.direction === 'rtl' ? 'right' : 'left'}: 0;
    
    ${isCollapsed ? `
      & .MuiDrawer-paper {
        width: ${COLLAPSED_WIDTH}px;
        overflow-x: hidden;
      }
    ` : ''}
  }
`;

/**
 * Main sidebar container with responsive behavior and theme integration
 * Supports both expanded and collapsed states with proper transitions
 */
export const SidebarContainer = styled(Box)(({ theme, isCollapsed = false }) => ({
  width: SIDEBAR_WIDTH,
  height: '100vh',
  position: 'fixed',
  zIndex: SIDEBAR_Z_INDEX,
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  
  // Apply responsive styles based on breakpoints
  [theme.breakpoints.up('sm')]: {
    width: isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH,
  },
  
  // Handle RTL layout support
  ...(theme.direction === 'rtl' && {
    right: 0,
    left: 'auto',
    borderRight: 'none',
    borderLeft: `1px solid ${theme.palette.divider}`,
  }),
  
  // Apply elevation in mobile view
  [theme.breakpoints.down('sm')]: {
    boxShadow: theme.shadows[8],
  },
  
  // Integrate with theme modes
  ...(theme.palette.mode === 'dark' && {
    backgroundColor: theme.palette.background.default,
    borderColor: theme.palette.divider,
  }),
}));

/**
 * Mobile drawer component with proper transitions and theme integration
 * Implements temporary drawer behavior for mobile viewports
 */
export const SidebarDrawer = styled(Drawer)(({ theme }) => ({
  width: SIDEBAR_WIDTH,
  flexShrink: 0,
  
  '& .MuiDrawer-paper': {
    width: SIDEBAR_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
    
    // Apply container styles from theme
    ...containerStyles.sidebar,
    
    // Handle scrolling behavior
    overflowY: 'auto',
    overflowX: 'hidden',
    
    // Apply elevation only in mobile view
    [theme.breakpoints.down('sm')]: {
      boxShadow: theme.shadows[8],
    },
    
    // Integrate with theme modes
    ...(theme.palette.mode === 'dark' && {
      backgroundColor: theme.palette.background.default,
    }),
  },
  
  // Apply responsive styles
  ...responsiveStyles.mobile,
  
  // Handle reduced motion preferences
  '@media (prefers-reduced-motion: reduce)': {
    '& .MuiDrawer-paper': {
      transition: 'none',
    },
  },
}));

/**
 * Sidebar content container with proper spacing and theme integration
 * Handles content layout and scrolling behavior
 */
export const SidebarContent = styled(Box)(({ theme, isCollapsed = false }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden auto',
  
  // Adjust padding when collapsed
  ...(isCollapsed && {
    padding: theme.spacing(1),
    alignItems: 'center',
  }),
  
  // Handle transition for padding changes
  transition: theme.transitions.create('padding', {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  
  // Apply scrollbar styling
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(255, 255, 255, 0.2)' 
      : 'rgba(0, 0, 0, 0.2)',
    borderRadius: 3,
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: 'transparent',
  },
  
  // Handle spacing between items
  '& > *:not(:last-child)': {
    marginBottom: theme.spacing(2),
  },
  
  // Integrate with theme modes
  ...(theme.palette.mode === 'dark' && {
    '& > *': {
      borderColor: theme.palette.divider,
    },
  }),
}));