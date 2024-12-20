import { PaletteMode, Theme } from '@mui/material'; // @mui/material v5.14+

/**
 * Core typography tokens defining font families, sizes and weights
 * Implements Inter as primary UI font and Roboto Mono for code/technical content
 */
export const TYPOGRAPHY = {
  fontFamily: {
    primary: 'Inter, sans-serif',
    secondary: 'Roboto Mono, monospace',
  },
  fontSize: {
    xs: '12px',    // Small labels, captions
    sm: '14px',    // Secondary text, metadata
    base: '16px',  // Body text, primary content
    lg: '20px',    // Subheadings, emphasized content
    xl: '24px',    // Section headings
    xxl: '32px',   // Page titles, hero text
  },
  fontWeight: {
    regular: 400,   // Normal body text
    medium: 500,    // Semi-emphasized text
    semibold: 600,  // Subheadings, important items
    bold: 700,      // Headings, strong emphasis
  },
} as const;

/**
 * Color palette tokens supporting both light and dark themes
 * Primary colors align with Material Design color system
 */
export const COLORS = {
  // Core brand and UI colors
  primary: '#1976D2',   // Primary actions, key UI elements
  secondary: '#424242', // Secondary actions, supporting elements
  error: '#D32F2F',     // Error states, destructive actions
  success: '#388E3C',   // Success states, confirmations
  
  // Theme-specific background colors
  background: {
    light: '#FFFFFF',
    dark: '#121212',
  },
  
  // Theme-specific text colors with opacity levels
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',   // Primary content
    secondary: 'rgba(0, 0, 0, 0.6)',  // Secondary content
  },
} as const;

/**
 * Spacing tokens based on 8px grid system
 * Provides consistent spacing scale across components
 */
export const SPACING = {
  base: 8,                           // Base unit in pixels
  scale: [4, 8, 16, 24, 32, 48],    // Common spacing values
  unit: 'px',                        // Default unit
} as const;

/**
 * Responsive breakpoint tokens for different device sizes
 * Aligns with Material UI's default breakpoint system
 */
export const BREAKPOINTS = {
  // Named breakpoints for semantic usage
  mobile: 360,    // Mobile devices
  tablet: 768,    // Tablet devices
  desktop: 1024,  // Desktop screens
  wide: 1440,     // Wide desktop screens

  // Material UI breakpoint values
  values: {
    xs: 360,   // Extra small devices
    sm: 768,   // Small devices
    md: 1024,  // Medium devices
    lg: 1440,  // Large devices
    xl: 1920,  // Extra large devices
  },
} as const;

/**
 * Elevation tokens defining shadow levels and depths
 * Implements Material Design elevation system
 */
export const ELEVATION = {
  // Named elevation levels for semantic usage
  levels: {
    low: '0 2px 4px rgba(0, 0, 0, 0.1)',      // Cards, buttons
    medium: '0 4px 8px rgba(0, 0, 0, 0.1)',    // Dropdowns, popovers
    high: '0 8px 16px rgba(0, 0, 0, 0.1)',     // Modals, dialogs
  },
  
  // Material UI shadow scale
  shadows: [
    'none',                                     // Level 0: No elevation
    '0 2px 4px rgba(0, 0, 0, 0.1)',           // Level 1: Slight elevation
    '0 4px 8px rgba(0, 0, 0, 0.1)',           // Level 2: Card elevation
    '0 8px 16px rgba(0, 0, 0, 0.1)',          // Level 3: Dropdown elevation
    '0 12px 24px rgba(0, 0, 0, 0.1)',         // Level 4: Modal elevation
    '0 16px 32px rgba(0, 0, 0, 0.1)',         // Level 5: Maximum elevation
  ],
} as const;

// Type definitions for theme mode
export type ThemeMode = PaletteMode;

// Re-export Theme type from Material UI for convenience
export type { Theme };