import { styled } from '@mui/material/styles'; // v5.14+
import { AppBar, Toolbar } from '@mui/material'; // v5.14+
import { COLORS, SPACING, BREAKPOINTS, ELEVATION } from '../../../constants/theme.constants';
import { surfaceStyles, responsiveStyles } from '../../../styles/theme.styles';

/**
 * Enhanced AppBar component with elevation, color, and theme support
 * Implements Material Design specifications with accessibility features
 */
export const StyledAppBar = styled(AppBar)`
  /* Core styles */
  background-color: var(--app-bar-background, ${COLORS.primary});
  box-shadow: ${ELEVATION.levels.low};
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 1100;

  /* Theme transitions */
  transition: background-color 0.3s ease;

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    background-color: var(--app-bar-background-dark, ${COLORS.background.dark});
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border-bottom: 2px solid ButtonText;
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* Print styles */
  @media print {
    display: none;
  }
`;

/**
 * Responsive Toolbar component with improved layout and spacing
 * Implements consistent spacing scale and responsive behavior
 */
export const StyledToolbar = styled(Toolbar)`
  /* Layout */
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 64px;
  padding: ${SPACING.scale[2]}px ${SPACING.scale[3]}px;
  gap: ${SPACING.scale[2]}px;

  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    min-height: 56px;
    padding: ${SPACING.scale[1]}px ${SPACING.scale[2]}px;
    gap: ${SPACING.scale[1]}px;
  }

  /* Theme variants */
  ${surfaceStyles.primary}

  /* Ensure toolbar is visible in high contrast mode */
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

/**
 * Enhanced container for app logo with responsive behavior
 * Implements focus states and spacing consistency
 */
export const LogoContainer = styled('div')`
  /* Layout */
  display: flex;
  align-items: center;
  gap: ${SPACING.scale[2]}px;
  height: 100%;
  padding: ${SPACING.scale[1]}px 0;

  /* Interactive states */
  transition: opacity 0.2s ease;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring-color, ${COLORS.primary});
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    gap: ${SPACING.scale[1]}px;
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Improved container for app bar actions with accessibility features
 * Implements consistent spacing and interactive states
 */
export const ActionsContainer = styled('div')`
  /* Layout */
  display: flex;
  align-items: center;
  gap: ${SPACING.scale[2]}px;
  height: 100%;

  /* Ensure actions remain visible */
  overflow: visible;
  white-space: nowrap;

  /* Responsive adjustments */
  ${responsiveStyles.mobile} {
    gap: ${SPACING.scale[1]}px;

    /* Hide labels on mobile, show only icons */
    .action-label {
      display: none;
    }
  }

  /* Interactive states for child elements */
  & > * {
    transition: transform 0.2s ease;
    
    &:hover {
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }

    /* Focus states */
    &:focus-visible {
      outline: 2px solid var(--focus-ring-color, ${COLORS.primary});
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    & > * {
      transition: none;
    }
  }

  /* High contrast mode */
  @media (forced-colors: active) {
    & > * {
      border: 1px solid ButtonText;
    }
  }
`;