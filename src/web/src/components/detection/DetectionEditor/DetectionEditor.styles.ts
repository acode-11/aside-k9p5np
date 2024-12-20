import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Paper } from '@mui/material'; // v5.14+
import { 
  containerStyles, 
  surfaceStyles, 
  responsiveStyles 
} from '../../../styles/theme.styles';
import { BREAKPOINTS, TYPOGRAPHY, COLORS } from '../../../constants/theme.constants';

// Global constants for editor layout
const TOOLBAR_HEIGHT = 64;
const PANEL_MIN_WIDTH = 400;
const RESIZE_HANDLE_WIDTH = 8;
const MOBILE_TOOLBAR_HEIGHT = 56;
const TRANSITION_DURATION = 200;

/**
 * Main container for the Detection Editor with responsive layout
 * and theme support
 */
export const EditorContainer = styled('div')`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background-color: var(--surface-background, ${COLORS.background.light});
  
  /* Dark mode support */
  &[data-theme="dark"] {
    background-color: var(--surface-background, ${COLORS.background.dark});
  }

  /* RTL support */
  &[dir="rtl"] {
    direction: rtl;
  }

  /* Mobile optimization */
  ${responsiveStyles.mobile};
`;

/**
 * Editor toolbar with sticky positioning and responsive height
 */
export const EditorToolbar = styled('div')`
  ${containerStyles.card};
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: ${TOOLBAR_HEIGHT}px;
  padding: 0 ${TYPOGRAPHY.fontSize.base};
  position: sticky;
  top: 0;
  z-index: 10;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  transition: height ${TRANSITION_DURATION}ms ease-in-out;

  /* Mobile optimization */
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    height: ${MOBILE_TOOLBAR_HEIGHT}px;
    padding: 0 ${TYPOGRAPHY.fontSize.sm};
  }

  /* Accessibility focus indicator */
  &:focus-within {
    outline: 2px solid ${COLORS.primary};
    outline-offset: -2px;
  }
`;

/**
 * Split-pane container with resizable panels
 */
export const EditorContent = styled(Box)`
  display: flex;
  flex: 1;
  min-height: 0;
  position: relative;
  
  /* Mobile layout */
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    flex-direction: column;
  }

  /* Tablet and desktop layout */
  @media (min-width: ${BREAKPOINTS.tablet}px) {
    flex-direction: row;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Left panel optimized for Monaco editor integration
 */
export const CodePanel = styled(Paper)`
  ${containerStyles.card};
  display: flex;
  flex-direction: column;
  min-width: ${PANEL_MIN_WIDTH}px;
  position: relative;
  overflow: hidden;

  /* Mobile layout */
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    min-width: 100%;
    height: 50vh;
  }

  /* Desktop layout */
  @media (min-width: ${BREAKPOINTS.desktop}px) {
    flex: 1;
  }

  /* Focus handling for accessibility */
  &:focus-within {
    ${surfaceStyles.primary};
    outline: none;
    box-shadow: 0 0 0 2px ${COLORS.primary};
  }
`;

/**
 * Right panel for preview content
 */
export const PreviewPanel = styled(Paper)`
  ${containerStyles.card};
  display: flex;
  flex-direction: column;
  min-width: ${PANEL_MIN_WIDTH}px;
  position: relative;
  overflow: auto;

  /* Mobile layout */
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    min-width: 100%;
    height: 50vh;
  }

  /* Desktop layout */
  @media (min-width: ${BREAKPOINTS.desktop}px) {
    flex: 1;
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
  }

  /* Dark mode scrollbar */
  [data-theme="dark"] &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
  }
`;

/**
 * Resize handle between panels
 */
export const ResizeHandle = styled('div')`
  width: ${RESIZE_HANDLE_WIDTH}px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color ${TRANSITION_DURATION}ms ease;

  /* Hide on mobile */
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    display: none;
  }

  /* Hover and active states */
  &:hover,
  &:active {
    background-color: rgba(0, 0, 0, 0.1);
  }

  /* Dark mode support */
  [data-theme="dark"] &:hover,
  [data-theme="dark"] &:active {
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Accessibility */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: -2px;
  }
`;