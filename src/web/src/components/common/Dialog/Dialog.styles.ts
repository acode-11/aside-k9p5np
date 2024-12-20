import { styled } from '@mui/material/styles'; // v5.14+
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // v5.14+
import { css } from '@emotion/react'; // v11.11+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../../styles/theme.styles';

/**
 * Creates base dialog styles with responsive behavior and theme integration
 */
const createDialogStyles = (theme: any) => css`
  ${containerStyles.dialog};
  ${surfaceStyles.primary};
  ${responsiveStyles.mobile};

  .MuiDialog-paper {
    max-height: 90vh;
    border-radius: var(--border-radius-lg, 12px);
    margin: var(--spacing-2, 16px);
    width: calc(100% - var(--spacing-4, 32px));
    max-width: 600px;

    @media (max-width: ${theme.breakpoints.values.sm}px) {
      margin: var(--spacing-1, 8px);
      width: calc(100% - var(--spacing-2, 16px));
      max-height: calc(100% - var(--spacing-4, 32px));
    }
  }
`;

/**
 * Styled Dialog component with custom theme integration and responsive behavior
 */
export const StyledDialog = styled(Dialog)`
  ${({ theme }) => createDialogStyles(theme)};
`;

/**
 * Styled DialogTitle with typography and spacing customization
 */
export const StyledDialogTitle = styled(DialogTitle)`
  padding: var(--spacing-3, 24px) var(--spacing-3, 24px) var(--spacing-2, 16px);
  border-bottom: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  
  .MuiTypography-root {
    font-family: var(--font-family-primary, 'Inter');
    font-size: var(--font-size-xl, 24px);
    font-weight: var(--font-weight-semibold, 600);
    line-height: 1.3;
    letter-spacing: -0.01em;
  }
`;

/**
 * Styled DialogContent with padding and scrolling behavior
 */
export const StyledDialogContent = styled(DialogContent)`
  padding: var(--spacing-3, 24px);
  overflow-y: auto;
  
  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 4px;
    
    &:hover {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  /* Reduced motion preference support */
  @media (prefers-reduced-motion: reduce) {
    scroll-behavior: auto;
  }
`;

/**
 * Styled DialogActions with button layout and spacing
 */
export const StyledDialogActions = styled(DialogActions)`
  padding: var(--spacing-2, 16px) var(--spacing-3, 24px);
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  gap: var(--spacing-1, 8px);
  
  /* Right-align buttons with proper spacing */
  justify-content: flex-end;
  
  /* Button hover state improvements */
  .MuiButton-root {
    min-width: 100px;
    
    &:not(:last-child) {
      margin-right: var(--spacing-1, 8px);
    }
  }

  /* Mobile responsiveness */
  @media (max-width: ${({ theme }) => theme.breakpoints.values.sm}px) {
    flex-direction: column-reverse;
    padding: var(--spacing-2, 16px);
    
    .MuiButton-root {
      width: 100%;
      margin-right: 0;
      
      &:not(:last-child) {
        margin-top: var(--spacing-1, 8px);
      }
    }
  }
`;