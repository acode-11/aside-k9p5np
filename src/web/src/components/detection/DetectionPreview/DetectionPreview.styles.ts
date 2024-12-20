import { styled } from '@mui/material/styles'; // v5.14+
import { Paper, Box } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../../styles/theme.styles';

/**
 * Main container for the detection preview panel
 * Implements scrollable container with responsive layout and elevation
 */
export const PreviewContainer = styled(Paper)`
  ${containerStyles.card};
  height: 100%;
  overflow: auto;
  transition: all 0.2s ease;
  
  /* Ensure content is visible when printing */
  @media print {
    overflow: visible;
    box-shadow: none;
    border: 1px solid ${({ theme }) => theme.palette.divider};
  }

  /* Desktop layout with minimum width */
  ${responsiveStyles.desktop} {
    min-width: 400px;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    border: 2px solid ${({ theme }) => theme.palette.primary.main};
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * Header section of the preview panel with platform selector
 * Implements flex layout with RTL support and theme-aware divider
 */
export const PreviewHeader = styled(Box)`
  padding: ${({ theme }) => theme.spacing(2)};
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing(2)};
  
  /* RTL layout support */
  [dir='rtl'] & {
    flex-direction: row-reverse;
  }

  /* Focus outline for keyboard navigation */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: -2px;
  }
`;

/**
 * Content section displaying the detection code
 * Implements monospace font and code formatting with accessibility features
 */
export const PreviewContent = styled(Box)`
  padding: ${({ theme }) => theme.spacing(2)};
  ${surfaceStyles.primary};
  font-family: 'Roboto Mono', monospace;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  tab-size: 2;

  /* Ensure code remains readable in high contrast mode */
  @media (prefers-contrast: high) {
    border: 1px solid;
    background-color: ${({ theme }) => theme.palette.background.paper};
    color: ${({ theme }) => theme.palette.text.primary};
  }

  /* Adjust font size for better readability on mobile */
  @media (max-width: ${({ theme }) => theme.breakpoints.values.sm}px) {
    font-size: 13px;
  }

  /* Ensure code is readable when printed */
  @media print {
    white-space: pre;
    overflow: visible;
    background: white !important;
    color: black !important;
  }
`;

/**
 * Container for validation results and performance metrics
 * Implements theme-aware styling with accessibility features
 */
export const ValidationResults = styled(Box)`
  padding: ${({ theme }) => theme.spacing(2)};
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
  
  /* Focus outline for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.primary.main};
    outline-offset: -2px;
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    border: 1px solid;
    margin-top: ${({ theme }) => theme.spacing(1)};
  }

  /* Ensure content is readable when printed */
  @media print {
    border-top: 1px solid black;
    page-break-inside: avoid;
  }
`;