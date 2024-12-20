import React from 'react'; // v18.2+
import { LoaderContainer, LoaderSpinner } from './Loader.styles';

// Constants for loader configuration
const DEFAULT_SIZE = 40;
const MIN_SIZE = 16;
const MAX_SIZE = 100;

/**
 * Props interface for the Loader component
 * @property {number} size - Size of the spinner in pixels (16-100px)
 * @property {string} color - Custom color for the spinner
 * @property {boolean} fullScreen - Whether to display in full screen mode
 * @property {string} ariaLabel - Accessibility label for screen readers
 */
interface LoaderProps {
  size?: number;
  color?: string;
  fullScreen?: boolean;
  ariaLabel?: string;
}

/**
 * A reusable loading spinner component that provides visual feedback during
 * asynchronous operations. Implements Material Design specifications and
 * includes accessibility features.
 *
 * @component
 * @example
 * // Basic usage
 * <Loader />
 *
 * // Custom size and color
 * <Loader size={32} color="#1976D2" />
 *
 * // Full screen loader
 * <Loader fullScreen />
 */
const Loader: React.FC<LoaderProps> = React.memo(({
  size = DEFAULT_SIZE,
  color,
  fullScreen = false,
  ariaLabel = 'Loading content'
}) => {
  // Validate size prop
  const validatedSize = Math.min(Math.max(size, MIN_SIZE), MAX_SIZE);

  // Check for reduced motion preference
  const prefersReducedMotion = React.useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <LoaderContainer
      role="progressbar"
      aria-label={ariaLabel}
      aria-busy="true"
      style={{
        position: fullScreen ? 'fixed' : 'relative',
        top: fullScreen ? 0 : undefined,
        left: fullScreen ? 0 : undefined,
        right: fullScreen ? 0 : undefined,
        bottom: fullScreen ? 0 : undefined,
        zIndex: fullScreen ? 9999 : undefined,
        backgroundColor: fullScreen ? 'rgba(255, 255, 255, 0.9)' : undefined
      }}
    >
      <LoaderSpinner
        size={validatedSize}
        color={color}
        aria-hidden="true"
        style={{
          // Disable animation if user prefers reduced motion
          animationPlayState: prefersReducedMotion ? 'paused' : 'running'
        }}
      />
    </LoaderContainer>
  );
});

// Display name for debugging purposes
Loader.displayName = 'Loader';

export default Loader;