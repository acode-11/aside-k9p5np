import { styled } from '@mui/material/styles'; // @mui/material v5.14+
import { Paper } from '@mui/material'; // @mui/material v5.14+
import { keyframes } from '@emotion/react'; // @emotion/react v11.11+
import { COLORS, SPACING, ELEVATION, BREAKPOINTS } from '../../constants/theme.constants';

// Type definition for notification variants
type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Helper function to get the appropriate color based on notification type
 * Returns theme-aware color values with proper contrast ratios
 */
const getNotificationColor = (type?: NotificationType): string => {
  switch (type) {
    case 'success':
      return COLORS.success;
    case 'error':
      return COLORS.error;
    case 'warning':
      return COLORS.warning;
    case 'info':
      return COLORS.primary;
    default:
      return COLORS.primary;
  }
};

/**
 * Slide-in animation keyframes for smooth notification appearance
 * Supports RTL layouts through transform direction
 */
export const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

/**
 * Main notification container component
 * Implements elevation, positioning, and responsive behavior
 */
export const NotificationContainer = styled(Paper)`
  position: fixed;
  top: ${SPACING.scale[3]}px; // 24px from top
  right: ${SPACING.scale[3]}px; // 24px from right
  min-width: 300px;
  max-width: 400px;
  z-index: 1400; // Ensure notifications appear above other UI elements
  box-shadow: ${ELEVATION.levels.medium};
  animation: ${slideIn} 0.3s ease-out;
  direction: ${props => props.theme.direction}; // Support RTL layouts
  border-radius: 4px;
  overflow: hidden;

  // Responsive adjustments for mobile devices
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    width: calc(100% - ${SPACING.scale[4]}px);
    right: ${SPACING.scale[2]}px;
    left: ${SPACING.scale[2]}px;
    max-width: none;
    top: ${SPACING.scale[2]}px;
  }
`;

/**
 * Notification content wrapper component
 * Handles layout, spacing, and alignment of notification content
 */
export const NotificationContent = styled('div')<{ type?: NotificationType }>`
  display: flex;
  align-items: center;
  padding: ${SPACING.scale[2]}px;
  color: ${props => getNotificationColor(props.type)};
  gap: ${SPACING.scale[1]}px;
  min-height: 48px; // Ensure minimum touch target size
  flex-wrap: wrap;
  word-break: break-word; // Prevent text overflow
  
  // Icon container styling
  .notification-icon {
    flex-shrink: 0;
    margin-right: ${SPACING.scale[1]}px;
  }

  // Message text styling
  .notification-message {
    flex: 1;
    font-family: ${props => props.theme.typography.fontFamily};
    font-size: ${props => props.theme.typography.body2.fontSize};
    line-height: 1.5;
  }

  // Action button styling
  .notification-action {
    margin-left: auto;
    padding: ${SPACING.scale[0]}px ${SPACING.scale[1]}px;
  }
`;

/**
 * Progress indicator for auto-dismissing notifications
 * Implements smooth transition animation
 */
export const NotificationProgress = styled('div')<{ duration: number }>`
  width: 100%;
  height: 2px;
  background-color: ${props => props.theme.palette.divider};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background-color: currentColor;
    animation: progress ${props => props.duration}ms linear;
    transform-origin: left;
  }

  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;