import { styled } from '@mui/material/styles'; // @mui/material v5.14+
import { keyframes } from '@emotion/react'; // @emotion/react v11.11+
import { COLORS, SPACING } from '../../../constants/theme.constants';

// Interface for LoaderSpinner props
interface LoaderSpinnerProps {
  size?: number;
  color?: string;
}

// Helper function to calculate spinner dimensions
const createSpinnerSize = (size?: number) => {
  const finalSize = size || SPACING.base * 4; // Default to 32px (4 * 8px base unit)
  return {
    width: `${finalSize}px`,
    height: `${finalSize}px`,
  };
};

// Keyframe animation for continuous rotation
const spin = keyframes`
  0% {
    transform: rotate(0deg) translate3d(0, 0, 0);
  }
  100% {
    transform: rotate(360deg) translate3d(0, 0, 0);
  }
`;

// Container component for centering the loader
export const LoaderContainer = styled('div')`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: ${SPACING.base * 6}px;
`;

// Animated spinner component with customizable size and color
export const LoaderSpinner = styled('div')<LoaderSpinnerProps>`
  ${({ size }) => createSpinnerSize(size)};
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-top-color: ${({ color }) => color || COLORS.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  
  /* Hardware acceleration for smoother animation */
  will-change: transform;
  transform: translate3d(0, 0, 0);
  
  /* Accessibility - hide from screen readers while maintaining visibility */
  &[aria-hidden='true'] {
    position: relative;
  }
  
  /* Ensure crisp edges on high DPI displays */
  @media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
    border-width: 1.5px;
  }
`;