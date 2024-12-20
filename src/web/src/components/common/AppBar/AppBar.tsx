/**
 * @fileoverview Enhanced AppBar component providing navigation, global search, and user controls
 * with comprehensive accessibility features and responsive behavior.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React, { useState, useCallback, useEffect } from 'react'; // v18.2.0
import {
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Tooltip,
  CircularProgress,
  Snackbar
} from '@mui/material'; // v5.14+
import {
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material'; // v5.14+

import {
  StyledAppBar,
  StyledToolbar,
  LogoContainer,
  ActionsContainer
} from './AppBar.styles';
import GlobalSearch from '../GlobalSearch/GlobalSearch';
import { useAuth } from '../../../hooks/useAuth';

// Constants for component configuration
const NOTIFICATION_CHECK_INTERVAL = 30000; // 30 seconds
const ERROR_DISPLAY_DURATION = 5000;

interface AppBarProps {
  onSettingsClick: () => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Enhanced AppBar component with accessibility features and error handling
 */
const AppBar: React.FC<AppBarProps> = ({
  onSettingsClick,
  className,
  ariaLabel = 'Application navigation bar'
}) => {
  // State management
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [notificationMenuAnchor, setNotificationMenuAnchor] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auth hook for user state and actions
  const { user, logout, isLoading } = useAuth();

  /**
   * Handle user menu interactions
   */
  const handleUserMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  }, []);

  const handleUserMenuClose = useCallback(() => {
    setUserMenuAnchor(null);
  }, []);

  /**
   * Handle notification menu interactions
   */
  const handleNotificationMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setNotificationMenuAnchor(event.currentTarget);
  }, []);

  const handleNotificationMenuClose = useCallback(() => {
    setNotificationMenuAnchor(null);
  }, []);

  /**
   * Handle logout with loading state and error handling
   */
  const handleLogout = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      handleUserMenuClose();
      await logout();
    } catch (error) {
      setError('Failed to logout. Please try again.');
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, handleUserMenuClose]);

  /**
   * Poll for new notifications
   */
  useEffect(() => {
    const checkNotifications = async () => {
      try {
        // Simulated notification check - replace with actual API call
        const count = Math.floor(Math.random() * 5);
        setNotifications(count);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    const intervalId = setInterval(checkNotifications, NOTIFICATION_CHECK_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <StyledAppBar 
      position="fixed" 
      className={className}
      aria-label={ariaLabel}
    >
      <StyledToolbar>
        <LogoContainer>
          <img 
            src="/logo.svg" 
            alt="AI-Powered Detection Platform" 
            height={32}
          />
        </LogoContainer>

        <GlobalSearch 
          placeholder="Search detections..."
          maxResults={10}
        />

        <ActionsContainer>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              aria-label={`${notifications} notifications`}
              onClick={handleNotificationMenuOpen}
              color="inherit"
              size="large"
            >
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Settings */}
          <Tooltip title="Settings">
            <IconButton
              aria-label="Open settings"
              onClick={onSettingsClick}
              color="inherit"
              size="large"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* User Menu */}
          <Tooltip title="Account menu">
            <IconButton
              aria-label="Account menu"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
              size="large"
            >
              {user?.firstName ? (
                <Avatar alt={`${user.firstName} ${user.lastName}`}>
                  {user.firstName[0]}
                </Avatar>
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          </Tooltip>
        </ActionsContainer>

        {/* Notification Menu */}
        <Menu
          id="notification-menu"
          anchorEl={notificationMenuAnchor}
          open={Boolean(notificationMenuAnchor)}
          onClose={handleNotificationMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleNotificationMenuClose}>
            No new notifications
          </MenuItem>
        </Menu>

        {/* User Menu */}
        <Menu
          id="user-menu"
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          {user && (
            <MenuItem disabled>
              {user.firstName} {user.lastName}
            </MenuItem>
          )}
          <MenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogoutIcon sx={{ mr: 1 }} />
            {isLoggingOut ? (
              <>
                Logging out
                <CircularProgress size={16} sx={{ ml: 1 }} />
              </>
            ) : (
              'Logout'
            )}
          </MenuItem>
        </Menu>

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={ERROR_DISPLAY_DURATION}
          onClose={() => setError(null)}
          message={error}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'center'
          }}
        />
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default AppBar;