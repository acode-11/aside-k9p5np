import { css } from '@emotion/react'; // v11.11+
import { GlobalStyles } from '@mui/material'; // v5.14+
import { TYPOGRAPHY, COLORS, SPACING } from '../constants/theme.constants';
import { scrollbarStyles } from './theme.styles';

/**
 * Global CSS styles with comprehensive reset rules and accessibility features
 * Implements design system tokens for consistent styling across the application
 */
const globalStyles = css`
  /* CSS Reset */
  *, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  /* Accessibility - Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Base HTML Elements */
  html {
    font-size: ${TYPOGRAPHY.fontSize.base}; /* 16px base font size */
    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    height: 100%;
  }

  body {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    color: ${COLORS.text.primary};
    background-color: var(--background-color, ${COLORS.background.light});
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
    overflow-x: hidden;
    ${scrollbarStyles}
  }

  /* Typography Reset */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    line-height: 1.2;
    margin: 0;
  }

  /* Interactive Elements */
  a {
    color: inherit;
    text-decoration: none;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${COLORS.primary};
      outline-offset: ${SPACING.base}px;
      border-radius: 2px;
    }
  }

  button {
    font: inherit;
    border: none;
    background: none;
    cursor: pointer;
    color: inherit;
    padding: 0;

    &:focus-visible {
      outline: 2px solid ${COLORS.primary};
      outline-offset: ${SPACING.base}px;
      border-radius: 2px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  /* Form Elements */
  input, textarea, select {
    font: inherit;
    color: inherit;
    background: transparent;

    &:focus {
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid ${COLORS.primary};
      outline-offset: ${SPACING.base}px;
      border-radius: 2px;
    }

    &::placeholder {
      color: ${COLORS.text.secondary};
      opacity: 1;
    }
  }

  /* Lists */
  ul, ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  /* Media Elements */
  img, picture, video, canvas, svg {
    display: block;
    max-width: 100%;
    height: auto;
  }

  /* Tables */
  table {
    border-collapse: collapse;
    border-spacing: 0;
    width: 100%;
  }

  /* Selection */
  ::selection {
    background-color: var(--selection-background, ${COLORS.primary});
    color: var(--selection-color, #ffffff);
  }

  /* High Contrast Mode Support */
  @media (forced-colors: active) {
    * {
      forced-color-adjust: none;
    }
  }

  /* Print Styles */
  @media print {
    body {
      background: none !important;
      color: ${COLORS.text.primary} !important;
    }

    a {
      text-decoration: underline;
    }

    @page {
      margin: 2cm;
    }
  }
`;

/**
 * Global styles component providing application-wide CSS reset and base styles
 * Implements design system tokens and accessibility features
 */
const AppGlobalStyles: React.FC = () => (
  <GlobalStyles
    styles={globalStyles}
  />
);

export default AppGlobalStyles;