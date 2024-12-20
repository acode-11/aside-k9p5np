import { styled } from '@mui/material/styles'; // v5.14+
import { FormControl, Select } from '@mui/material'; // v5.14+
import { COLORS, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';
import { responsiveStyles } from '../../../styles/theme.styles';

/**
 * Container component for the platform selector with responsive layout
 * Implements design system spacing and background colors with accessibility support
 */
export const PlatformSelectorContainer = styled(FormControl)`
  display: flex;
  align-items: center;
  gap: ${SPACING.scale[2]}px; // 16px spacing between elements
  margin: ${SPACING.scale[2]}px 0;
  padding: ${SPACING.scale[1]}px; // 8px padding
  background-color: ${({ theme }) => theme.palette.background.paper};
  border-radius: ${SPACING.scale[0]}px; // 4px border radius
  width: auto;
  min-width: 250px;

  // Mobile layout adjustments
  ${responsiveStyles.mobile} {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    padding: ${SPACING.scale[2]}px;
  }

  // Tablet layout optimizations
  ${responsiveStyles.tablet} {
    padding: ${SPACING.scale[1]}px;
    min-width: 300px;
  }

  // Desktop enhancements
  ${responsiveStyles.desktop} {
    transition: box-shadow 0.2s ease-in-out;
    
    &:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
  }

  // High contrast mode support
  @media (forced-colors: active) {
    border: 1px solid ButtonText;
  }
`;

/**
 * Styled platform selection dropdown with enhanced visual feedback
 * Implements design system colors and interactive states
 */
export const PlatformSelect = styled(Select)`
  min-width: 200px;
  font-family: ${({ theme }) => theme.typography.fontFamily};
  color: ${({ theme }) => theme.palette.text.primary};
  
  // Mobile responsiveness
  ${responsiveStyles.mobile} {
    width: 100%;
  }

  // Focus state styling
  &.Mui-focused .MuiOutlinedInput-notchedOutline {
    border-color: ${COLORS.primary};
    border-width: 2px;
  }

  // Hover state styling
  &:hover .MuiOutlinedInput-notchedOutline {
    border-color: ${COLORS.secondary};
  }

  // Dropdown icon styling
  .MuiSelect-icon {
    color: ${COLORS.secondary};
    transition: transform 0.2s ease-in-out;
  }

  // Open state dropdown icon rotation
  &.Mui-expanded .MuiSelect-icon {
    transform: rotate(180deg);
  }

  // Disabled state styling
  &.Mui-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  // Error state styling
  &.Mui-error .MuiOutlinedInput-notchedOutline {
    border-color: ${({ theme }) => theme.palette.error.main};
  }

  // Keyboard focus indication
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }
`;

/**
 * Styled platform icon component with consistent sizing and spacing
 * Implements design system spacing and responsive adjustments
 */
export const PlatformIcon = styled('img')`
  width: 24px;
  height: 24px;
  margin-right: ${SPACING.scale[1]}px; // 8px right margin
  object-fit: contain;
  vertical-align: middle;
  
  // Mobile spacing adjustments
  ${responsiveStyles.mobile} {
    margin-right: ${SPACING.scale[2]}px; // 16px right margin on mobile
  }

  // Tablet spacing adjustments
  ${responsiveStyles.tablet} {
    margin-right: ${SPACING.scale[1]}px; // 8px right margin on tablet
  }

  // High DPI screen optimizations
  @media (min-resolution: 2dppx) {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }

  // Loading state placeholder
  &[aria-busy="true"] {
    opacity: 0.6;
  }

  // Error state fallback
  &[aria-invalid="true"] {
    opacity: 0.4;
    filter: grayscale(100%);
  }
`;

/**
 * Styled helper text for platform selection with accessibility support
 */
export const PlatformHelperText = styled('span')`
  color: ${({ theme }) => theme.palette.text.secondary};
  font-size: ${({ theme }) => theme.typography.caption.fontSize};
  margin-top: ${SPACING.scale[0]}px; // 4px top margin
  
  // Error state styling
  &.Mui-error {
    color: ${({ theme }) => theme.palette.error.main};
  }

  // Screen reader only text
  &.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
  }
`;