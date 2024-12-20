import React, { useCallback } from 'react';
import { Card as MuiCard, CardContent, CardActions } from '@mui/material'; // v5.14+
import { StyledCard, StyledCardContent, StyledCardActions } from './Card.styles';
import { containerStyles } from '../../styles/theme.styles';

/**
 * Props interface for the Card component with comprehensive typing
 */
export interface CardProps {
  /** Primary content of the card */
  children: React.ReactNode;
  /** Optional card title or header content */
  title?: string | React.ReactNode;
  /** Elevation level (0-5) following Material Design system */
  elevation?: number;
  /** Optional action buttons or controls */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Click handler for interactive cards */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** ARIA role for accessibility */
  role?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** ARIA label for accessibility */
  'aria-label'?: string;
}

/**
 * A reusable card component that implements the design system's specifications.
 * Supports content, actions, elevation levels, responsive behavior, and accessibility features.
 * 
 * @example
 * ```tsx
 * <Card 
 *   title="Example Card"
 *   elevation={2}
 *   actions={<Button>Action</Button>}
 *   onClick={() => console.log('Card clicked')}
 * >
 *   Card content goes here
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  children,
  title,
  elevation = 1,
  actions,
  className = '',
  onClick,
  role = 'article',
  tabIndex = 0,
  'aria-label': ariaLabel,
  ...props
}) => {
  /**
   * Handles card click events with proper event bubbling control
   */
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      event.stopPropagation();
      onClick(event);
    }
  }, [onClick]);

  /**
   * Handles keyboard events for accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  }, [onClick]);

  return (
    <StyledCard
      elevation={elevation}
      className={`card ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={role}
      tabIndex={onClick ? tabIndex : -1}
      aria-label={ariaLabel}
      interactive={Boolean(onClick)}
      css={containerStyles.card}
      {...props}
    >
      {title && (
        <StyledCardContent padding={2}>
          {typeof title === 'string' ? (
            <h2 className="card-title">{title}</h2>
          ) : (
            title
          )}
        </StyledCardContent>
      )}

      <StyledCardContent 
        padding={2}
        className="card-content"
      >
        {children}
      </StyledCardContent>

      {actions && (
        <StyledCardActions 
          alignment="flex-end"
          spacing={1}
          className="card-actions"
        >
          {actions}
        </StyledCardActions>
      )}
    </StyledCard>
  );
};

/**
 * Default props for the Card component
 */
Card.defaultProps = {
  elevation: 1,
  className: '',
  role: 'article',
  tabIndex: 0,
};

export default Card;