import React, { useMemo, useCallback } from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // v5.14+
import TrendingDownIcon from '@mui/icons-material/TrendingDown'; // v5.14+

import {
  AnalyticsCardRoot,
  AnalyticsCardHeader,
  AnalyticsCardContent,
  AnalyticsCardValue,
  AnalyticsCardTrend
} from './AnalyticsCard.styles';

/**
 * Props interface for the AnalyticsCard component
 */
interface AnalyticsCardProps {
  /** Title of the analytics metric with localization support */
  title: string;
  /** Current value of the metric with formatting options */
  value: string | number;
  /** Percentage change in metric value with validation */
  trend?: number;
  /** Optional CSS class name for custom styling */
  className?: string;
  /** Optional click handler with event type safety */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Test identifier for automated testing */
  testId?: string;
}

/**
 * Formats the trend value as a percentage string with sign and localization
 * @param trend - Numeric trend value to format
 * @param locale - Locale string for number formatting
 * @returns Formatted trend string with sign and percentage
 */
const formatTrend = (trend: number, locale: string = 'en-US'): string => {
  if (!trend && trend !== 0) return '';
  
  const formatter = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: 'always'
  });

  return `${formatter.format(trend)}%`;
};

/**
 * AnalyticsCard Component
 * 
 * A reusable card component for displaying analytics metrics with trend indicators.
 * Implements responsive design, accessibility features, and performance optimizations.
 * 
 * @component
 * @example
 * ```tsx
 * <AnalyticsCard
 *   title="Active Users"
 *   value="1,234"
 *   trend={5.2}
 *   onClick={handleCardClick}
 * />
 * ```
 */
const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  trend = 0,
  className = '',
  onClick,
  ariaLabel = '',
  testId = 'analytics-card'
}) => {
  // Memoize formatted trend value to prevent unnecessary recalculations
  const formattedTrend = useMemo(() => formatTrend(trend), [trend]);

  // Memoize trend icon to prevent unnecessary re-renders
  const TrendIcon = useMemo(() => 
    trend > 0 ? TrendingUpIcon : TrendingDownIcon,
    [trend]
  );

  /**
   * Handle card click events with keyboard interaction support
   */
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent event bubbling
    event.stopPropagation();

    if (onClick) {
      onClick(event);
    }
  }, [onClick]);

  /**
   * Handle keyboard interactions for accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (onClick) {
        onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
    }
  }, [onClick]);

  return (
    <AnalyticsCardRoot
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel || title}
      data-testid={testId}
    >
      <AnalyticsCardContent>
        <AnalyticsCardHeader variant="h6" component="h2">
          {title}
        </AnalyticsCardHeader>
        
        <AnalyticsCardValue variant="h3" component="div">
          {value}
        </AnalyticsCardValue>

        {trend !== undefined && (
          <AnalyticsCardTrend
            trend={trend}
            role="status"
            aria-label={`Trend ${formattedTrend}`}
          >
            <TrendIcon
              fontSize="small"
              aria-hidden="true"
            />
            {formattedTrend}
          </AnalyticsCardTrend>
        )}
      </AnalyticsCardContent>
    </AnalyticsCardRoot>
  );
};

// Default props for type safety and documentation
AnalyticsCard.defaultProps = {
  className: '',
  trend: 0,
  ariaLabel: '',
  testId: 'analytics-card'
};

export default AnalyticsCard;