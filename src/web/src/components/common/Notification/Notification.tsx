import React, { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { IconButton, Alert, Fade } from '@mui/material'; // @mui/material v5.14+
import { Close } from '@mui/icons-material'; // @mui/icons-material v5.14+
import { NotificationContainer, NotificationContent } from './Notification.styles';
import { uiActions } from '../../../store/slices/uiSlice';

// Constants
const AUTO_HIDE_DURATION = 3000; // Default duration in ms
const ANIMATION_DURATION = 300; // Animation duration in ms
const TEST_IDS = {
  NOTIFICATION_CONTAINER: 'notification-container',
  CLOSE_BUTTON: 'notification-close-button',
} as const;

// Types
type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  type: NotificationType;
  message: string;
  duration?: number | null;
  autoHide?: boolean;
  onClose?: (event?: React.SyntheticEvent) => void;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  className?: string;
  testId?: string;
}

interface NotificationState {
  isVisible: boolean;
  isExiting: boolean;
  currentMessage: string | null;
}

/**
 * Custom hook to manage notification timer
 * @param duration - Duration in milliseconds before auto-hide
 * @param autoHide - Whether to auto-hide the notification
 */
const useNotificationTimer = (
  duration: number | null | undefined,
  autoHide: boolean | undefined,
  onClose: (() => void)
) => {
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (autoHide && duration) {
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, autoHide, onClose]);
};

/**
 * Notification component that displays temporary messages with different severity levels
 * Implements Material-UI styling system and supports animations
 * 
 * @param props - NotificationProps
 * @returns ReactElement | null
 */
const Notification: React.FC<NotificationProps> = React.memo(({
  type = 'info',
  message,
  duration = AUTO_HIDE_DURATION,
  autoHide = true,
  onClose,
  anchorOrigin = { vertical: 'top', horizontal: 'right' },
  className,
  testId = TEST_IDS.NOTIFICATION_CONTAINER,
}) => {
  const dispatch = useDispatch();
  const notificationState = useSelector(state => state.ui.notification);
  const [state, setState] = React.useState<NotificationState>({
    isVisible: false,
    isExiting: false,
    currentMessage: null,
  });

  // Handle notification close
  const handleClose = useCallback((event?: React.SyntheticEvent) => {
    setState(prev => ({ ...prev, isExiting: true }));
    
    // Allow animation to complete before dispatching close action
    setTimeout(() => {
      dispatch(uiActions.hideNotification());
      onClose?.(event);
    }, ANIMATION_DURATION);
  }, [dispatch, onClose]);

  // Set up auto-hide timer
  useNotificationTimer(duration, autoHide, handleClose);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  // Update visibility state when notification changes
  useEffect(() => {
    if (notificationState?.message) {
      setState({
        isVisible: true,
        isExiting: false,
        currentMessage: notificationState.message,
      });
    }
  }, [notificationState]);

  // Don't render if no notification is active
  if (!state.isVisible || !state.currentMessage) {
    return null;
  }

  return (
    <Fade
      in={!state.isExiting}
      timeout={ANIMATION_DURATION}
      unmountOnExit
    >
      <NotificationContainer
        className={className}
        data-testid={testId}
        role="alert"
        aria-live="polite"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        elevation={6}
        style={{
          ...anchorOrigin.vertical === 'bottom' ? { bottom: 24, top: 'auto' } : {},
          ...anchorOrigin.horizontal === 'left' ? { left: 24, right: 'auto' } : 
             anchorOrigin.horizontal === 'center' ? { left: '50%', transform: 'translateX(-50%)' } : {},
        }}
      >
        <NotificationContent type={type}>
          <Alert
            severity={type}
            action={
              <IconButton
                aria-label="Close notification"
                color="inherit"
                size="small"
                onClick={handleClose}
                data-testid={TEST_IDS.CLOSE_BUTTON}
              >
                <Close fontSize="small" />
              </IconButton>
            }
          >
            {state.currentMessage}
          </Alert>
        </NotificationContent>
      </NotificationContainer>
    </Fade>
  );
});

Notification.displayName = 'Notification';

export default Notification;