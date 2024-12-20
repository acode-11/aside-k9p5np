import { createTheme, Theme } from '@mui/material/styles'; // @mui/material v5.14+
import { PaletteMode } from '@mui/material'; // @mui/material v5.14+
import {
  TYPOGRAPHY,
  COLORS,
  SPACING,
  BREAKPOINTS,
  ELEVATION,
} from '../constants/theme.constants';

/**
 * Global style overrides applied via MuiCssBaseline
 */
const globalStyles = {
  html: {
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    boxSizing: 'border-box',
  },
  '*, *::before, *::after': {
    boxSizing: 'inherit',
  },
  body: {
    margin: 0,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: TYPOGRAPHY.fontFamily.primary,
    lineHeight: 1.5,
  },
  'code, pre': {
    fontFamily: TYPOGRAPHY.fontFamily.secondary,
  },
};

/**
 * Component-specific style overrides
 */
const componentOverrides = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        borderRadius: SPACING.base,
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiInputBase-root': {
          borderRadius: SPACING.base,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: SPACING.base * 2,
        boxShadow: ELEVATION.levels.low,
      },
    },
  },
};

/**
 * Creates a theme instance with mode-specific configurations
 * @param mode - The theme mode (light/dark)
 * @returns A complete Material-UI theme instance
 */
const createAppTheme = (mode: PaletteMode): Theme => {
  // Base palette configuration
  const palette = {
    mode,
    primary: {
      main: COLORS.primary,
      contrastText: '#ffffff',
    },
    secondary: {
      main: COLORS.secondary,
      contrastText: '#ffffff',
    },
    error: {
      main: COLORS.error,
    },
    success: {
      main: COLORS.success,
    },
    background: {
      default: mode === 'light' ? COLORS.background.light : COLORS.background.dark,
      paper: mode === 'light' ? COLORS.background.light : COLORS.background.dark,
    },
    text: {
      primary: mode === 'light' ? COLORS.text.primary : 'rgba(255, 255, 255, 0.87)',
      secondary: mode === 'light' ? COLORS.text.secondary : 'rgba(255, 255, 255, 0.6)',
    },
  };

  // Create the base theme configuration
  return createTheme({
    palette,
    typography: {
      fontFamily: TYPOGRAPHY.fontFamily.primary,
      fontSize: parseInt(TYPOGRAPHY.fontSize.base),
      h1: {
        fontSize: TYPOGRAPHY.fontSize.xxl,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.semibold,
        lineHeight: 1.4,
      },
      body1: {
        fontSize: TYPOGRAPHY.fontSize.base,
        lineHeight: 1.5,
      },
      body2: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        lineHeight: 1.6,
      },
      button: {
        textTransform: 'none',
        fontWeight: TYPOGRAPHY.fontWeight.medium,
      },
    },
    spacing: SPACING.base,
    breakpoints: {
      values: BREAKPOINTS.values,
    },
    shadows: ELEVATION.shadows,
    components: {
      MuiCssBaseline: {
        styleOverrides: globalStyles,
      },
      ...componentOverrides,
    },
    shape: {
      borderRadius: SPACING.base,
    },
  });
};

// Create and export theme instances for both modes
export const lightTheme: Theme = createAppTheme('light');
export const darkTheme: Theme = createAppTheme('dark');

// Export the theme creation function for dynamic theme switching
export { createAppTheme };