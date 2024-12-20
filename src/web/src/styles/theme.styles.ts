import { css } from '@emotion/react'; // v11.11+
import { styled } from '@mui/material/styles'; // v5.14+
import { 
  TYPOGRAPHY, 
  COLORS, 
  SPACING, 
  BREAKPOINTS, 
  ELEVATION 
} from '../constants/theme.constants';
import {
  headingStyles,
  bodyStyles,
  codeStyles
} from './typography.styles';

/**
 * Creates elevation/shadow CSS with custom property support and fallbacks
 * @param level Elevation level ('low', 'medium', 'high') or numeric index
 * @returns CSS box-shadow value with fallbacks
 */
export const createElevation = (level: 'low' | 'medium' | 'high' | number): string => {
  if (typeof level === 'string') {
    return `var(--elevation-${level}, ${ELEVATION.levels[level]})`;
  }
  const numericLevel = Math.min(Math.max(level, 0), ELEVATION.shadows.length - 1);
  return `var(--elevation-${numericLevel}, ${ELEVATION.shadows[numericLevel]})`;
};

/**
 * Creates spacing CSS based on scale multiplier with unit conversion
 * @param multiplier Scale multiplier for base spacing unit
 * @returns CSS spacing value with rem units
 */
export const createSpacing = (multiplier: number): string => {
  const baseSpacing = SPACING.base * Math.max(multiplier, 0);
  return `var(--spacing-${multiplier}, ${baseSpacing / 16}rem)`;
};

/**
 * Container component styles with elevation, spacing, and interaction states
 */
export const containerStyles = {
  card: css`
    padding: ${createSpacing(2)};
    box-shadow: ${createElevation('low')};
    border-radius: var(--border-radius-md, 8px);
    background-color: var(--surface-background, ${COLORS.background.light});
    transition: box-shadow 0.2s ease-in-out;
  `,

  dialog: css`
    padding: ${createSpacing(3)};
    box-shadow: ${createElevation('medium')};
    border-radius: var(--border-radius-lg, 12px);
    background-color: var(--surface-background, ${COLORS.background.light});
    max-width: calc(100% - ${createSpacing(4)});
    margin: ${createSpacing(2)};
  `,

  sidebar: css`
    padding: ${createSpacing(2)};
    box-shadow: ${createElevation('high')};
    border-radius: 0;
    background-color: var(--surface-background, ${COLORS.background.light});
    height: 100%;
    overflow-y: auto;
  `,

  cardElevated: css`
    ${containerStyles.card};
    box-shadow: ${createElevation('high')};
  `,

  cardInteractive: css`
    ${containerStyles.card};
    cursor: pointer;
    
    &:hover {
      box-shadow: ${createElevation('medium')};
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0);
    }
  `,
} as const;

/**
 * Surface background styles with color variants and themes
 */
export const surfaceStyles = {
  primary: css`
    background-color: var(--color-primary, ${COLORS.primary});
    color: var(--color-primary-contrast, #ffffff);
  `,

  secondary: css`
    background-color: var(--color-secondary, ${COLORS.secondary});
    color: var(--color-secondary-contrast, #ffffff);
  `,

  primaryDark: css`
    background-color: var(--color-primary-dark, ${COLORS.primary});
    color: var(--color-primary-dark-contrast, #ffffff);
    filter: brightness(0.85);
  `,

  secondaryDark: css`
    background-color: var(--color-secondary-dark, ${COLORS.secondary});
    color: var(--color-secondary-dark-contrast, #ffffff);
    filter: brightness(0.85);
  `,

  gradient: css`
    background: linear-gradient(
      var(--gradient-angle, 45deg),
      var(--gradient-start, ${COLORS.primary}),
      var(--gradient-end, ${COLORS.secondary})
    );
    color: var(--gradient-contrast, #ffffff);
  `,
} as const;

/**
 * Responsive breakpoint mixins with print and orientation support
 */
export const responsiveStyles = {
  mobile: css`
    @media (max-width: ${BREAKPOINTS.tablet - 1}px) {
      @media (hover: none) {
        /* Touch-specific styles */
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
      }
    }
  `,

  tablet: css`
    @media (min-width: ${BREAKPOINTS.tablet}px) and (max-width: ${BREAKPOINTS.desktop - 1}px) {
      /* Tablet-specific styles */
    }
  `,

  desktop: css`
    @media (min-width: ${BREAKPOINTS.desktop}px) {
      @media (min-resolution: 2dppx) {
        /* High DPI styles */
        font-smoothing: antialiased;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
    }
  `,

  print: css`
    @media print {
      /* Print-specific styles */
      background: white !important;
      color: black !important;
      box-shadow: none !important;
      text-shadow: none !important;
    }
  `,

  portrait: css`
    @media (orientation: portrait) {
      /* Portrait orientation styles */
    }
  `,

  landscape: css`
    @media (orientation: landscape) {
      /* Landscape orientation styles */
    }
  `,

  reducedMotion: css`
    @media (prefers-reduced-motion: reduce) {
      * {
        animation: none !important;
        transition: none !important;
      }
    }
  `,
} as const;

/**
 * Re-export typography styles for convenience
 */
export {
  headingStyles,
  bodyStyles,
  codeStyles
};