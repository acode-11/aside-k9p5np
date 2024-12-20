import { styled } from '@mui/material/styles'; // @mui/material v5.14+
import { Button } from '@mui/material'; // @mui/material v5.14+
import { css } from '@emotion/react'; // @emotion/react v11.11+

import { COLORS, TYPOGRAPHY, SPACING, ELEVATION } from '../../constants/theme.constants';

// Base button styles shared across all variants
const baseButtonStyles = css`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  text-transform: none;
  border-radius: ${SPACING.base/2}px;
  transition: all 0.2s ease-in-out;
  box-shadow: ${ELEVATION.shadows[1]};
  position: relative;
  overflow: hidden;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
  }
  
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }
  
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    min-height: 44px; // Ensure touch-friendly tap targets
  }
`;

// Generate variant-specific styles
const getButtonVariantStyles = (variant: 'contained' | 'outlined' | 'text') => {
  switch (variant) {
    case 'contained':
      return css`
        background-color: ${COLORS.primary};
        color: #FFFFFF;
        border: none;
        
        &:hover {
          background-color: ${COLORS.primary}E6;
          box-shadow: ${ELEVATION.shadows[2]};
        }
        
        &:active {
          background-color: ${COLORS.primary}CC;
          box-shadow: ${ELEVATION.shadows[1]};
          transform: translateY(1px);
        }
        
        &.error {
          background-color: ${COLORS.error};
          &:hover { background-color: ${COLORS.error}E6; }
          &:active { background-color: ${COLORS.error}CC; }
        }
        
        &.success {
          background-color: ${COLORS.success};
          &:hover { background-color: ${COLORS.success}E6; }
          &:active { background-color: ${COLORS.success}CC; }
        }
      `;
      
    case 'outlined':
      return css`
        background-color: transparent;
        color: ${COLORS.primary};
        border: 2px solid ${COLORS.primary};
        
        &:hover {
          background-color: ${COLORS.primary}0A;
          border-color: ${COLORS.primary}CC;
        }
        
        &:active {
          background-color: ${COLORS.primary}14;
          transform: translateY(1px);
        }
        
        &.error {
          color: ${COLORS.error};
          border-color: ${COLORS.error};
          &:hover {
            background-color: ${COLORS.error}0A;
            border-color: ${COLORS.error}CC;
          }
          &:active { background-color: ${COLORS.error}14; }
        }
        
        &.success {
          color: ${COLORS.success};
          border-color: ${COLORS.success};
          &:hover {
            background-color: ${COLORS.success}0A;
            border-color: ${COLORS.success}CC;
          }
          &:active { background-color: ${COLORS.success}14; }
        }
      `;
      
    case 'text':
      return css`
        background-color: transparent;
        color: ${COLORS.primary};
        border: none;
        box-shadow: none;
        
        &:hover {
          background-color: ${COLORS.primary}0A;
        }
        
        &:active {
          background-color: ${COLORS.primary}14;
          transform: translateY(1px);
        }
        
        &.error {
          color: ${COLORS.error};
          &:hover { background-color: ${COLORS.error}0A; }
          &:active { background-color: ${COLORS.error}14; }
        }
        
        &.success {
          color: ${COLORS.success};
          &:hover { background-color: ${COLORS.success}0A; }
          &:active { background-color: ${COLORS.success}14; }
        }
      `;
  }
};

// Generate size-specific styles
const getButtonSizeStyles = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return css`
        padding: ${SPACING.scale[0]}px ${SPACING.scale[2]}px;
        font-size: ${TYPOGRAPHY.fontSize.sm};
        min-width: 64px;
        height: 32px;
        
        .MuiButton-startIcon {
          margin-right: ${SPACING.scale[1]}px;
          svg { font-size: 18px; }
        }
        
        .MuiButton-endIcon {
          margin-left: ${SPACING.scale[1]}px;
          svg { font-size: 18px; }
        }
      `;
      
    case 'medium':
      return css`
        padding: ${SPACING.scale[1]}px ${SPACING.scale[3]}px;
        font-size: ${TYPOGRAPHY.fontSize.base};
        min-width: 80px;
        height: 40px;
        
        .MuiButton-startIcon {
          margin-right: ${SPACING.scale[2]}px;
          svg { font-size: 20px; }
        }
        
        .MuiButton-endIcon {
          margin-left: ${SPACING.scale[2]}px;
          svg { font-size: 20px; }
        }
      `;
      
    case 'large':
      return css`
        padding: ${SPACING.scale[2]}px ${SPACING.scale[4]}px;
        font-size: ${TYPOGRAPHY.fontSize.lg};
        min-width: 96px;
        height: 48px;
        
        .MuiButton-startIcon {
          margin-right: ${SPACING.scale[2]}px;
          svg { font-size: 24px; }
        }
        
        .MuiButton-endIcon {
          margin-left: ${SPACING.scale[2]}px;
          svg { font-size: 24px; }
        }
      `;
  }
};

// Styled Button component with comprehensive style handling
export const StyledButton = styled(Button, {
  shouldForwardProp: (prop) => !['color', 'size'].includes(prop as string),
})<{
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
}>`
  ${baseButtonStyles}
  ${({ variant = 'contained' }) => getButtonVariantStyles(variant)}
  ${({ size = 'medium' }) => getButtonSizeStyles(size)}
  
  // Loading state styles
  &.loading {
    pointer-events: none;
    opacity: 0.7;
    
    .MuiCircularProgress-root {
      margin-right: ${SPACING.scale[1]}px;
    }
  }
  
  // Full width modifier
  &.fullWidth {
    width: 100%;
  }
  
  // Icon-only button styles
  &.iconOnly {
    padding: ${SPACING.scale[1]}px;
    min-width: unset;
    width: ${({ size = 'medium' }) => 
      size === 'small' ? '32px' : 
      size === 'medium' ? '40px' : '48px'
    };
    
    .MuiButton-startIcon,
    .MuiButton-endIcon {
      margin: 0;
    }
  }
`;

export default StyledButton;