import React, { useCallback, useMemo } from 'react'; // React v18.2+
import { ButtonProps as MuiButtonProps, CircularProgress } from '@mui/material'; // @mui/material v5.14+
import StyledButton from './Button.styles';

/**
 * Extended props interface for the Button component with enhanced functionality
 */
export interface ButtonProps extends Omit<MuiButtonProps, 'color' | 'size' | 'variant'> {
  /** Content to be rendered inside the button */
  children: React.ReactNode;
  /** Visual style variant of the button */
  variant?: 'contained' | 'outlined' | 'text';
  /** Size of the button */
  size?: 'small' | 'medium' | 'large';
  /** Color scheme of the button */
  color?: 'primary' | 'secondary' | 'error' | 'success';
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Whether the button is in a loading state */
  loading?: boolean;
  /** Whether the button should take full width of its container */
  fullWidth?: boolean;
  /** Click handler function */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  /** HTML button type */
  type?: 'button' | 'submit' | 'reset';
  /** Icon to display before button text */
  startIcon?: React.ReactNode;
  /** Icon to display after button text */
  endIcon?: React.ReactNode;
  /** Position of the loading indicator */
  loadingPosition?: 'start' | 'end' | 'center';
  /** Custom loading indicator component */
  loadingIndicator?: React.ReactNode;
  /** Whether to disable elevation */
  disableElevation?: boolean;
  /** Whether to disable ripple effect */
  disableRipple?: boolean;
}

/**
 * A comprehensive, accessible button component that implements the design system's specifications.
 * Built on Material-UI's Button component with enhanced functionality and consistent styling.
 */
const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  startIcon,
  endIcon,
  loadingPosition = 'center',
  loadingIndicator,
  disableElevation = false,
  disableRipple = false,
  className,
  ...props
}) => {
  // Memoize loading indicator component
  const LoadingComponent = useMemo(() => (
    loadingIndicator || (
      <CircularProgress
        size={size === 'small' ? 16 : size === 'medium' ? 20 : 24}
        color="inherit"
      />
    )
  ), [loadingIndicator, size]);

  // Enhanced click handler with loading state management
  const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }

    // Execute onClick handler if provided
    if (onClick) {
      const result = onClick(event);
      
      // Handle promise-based onClick handlers
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error('Button click handler error:', error);
        });
      }
    }
  }, [disabled, loading, onClick]);

  // Compute button content based on loading state and position
  const buttonContent = useMemo(() => {
    if (!loading) {
      return children;
    }

    const loadingElement = LoadingComponent;

    switch (loadingPosition) {
      case 'start':
        return (
          <>
            {loadingElement}
            {children}
          </>
        );
      case 'end':
        return (
          <>
            {children}
            {loadingElement}
          </>
        );
      default:
        return loadingElement;
    }
  }, [loading, loadingPosition, LoadingComponent, children]);

  // Compute combined className
  const combinedClassName = useMemo(() => {
    const classes = [className];
    if (loading) classes.push('loading');
    if (fullWidth) classes.push('fullWidth');
    if (!children && (startIcon || endIcon)) classes.push('iconOnly');
    if (color) classes.push(color);
    return classes.filter(Boolean).join(' ');
  }, [className, loading, fullWidth, children, startIcon, endIcon, color]);

  return (
    <StyledButton
      variant={variant}
      size={size}
      disabled={disabled || loading}
      onClick={handleClick}
      type={type}
      startIcon={!loading && startIcon}
      endIcon={!loading && endIcon}
      className={combinedClassName}
      disableElevation={disableElevation}
      disableRipple={disableRipple}
      aria-busy={loading}
      {...props}
    >
      {buttonContent}
    </StyledButton>
  );
});

// Display name for debugging
Button.displayName = 'Button';

export default Button;