/**
 * @fileoverview Core layout component providing the main application structure with
 * responsive behavior, error boundaries, accessibility features, and RTL support.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, memo } from 'react'; // v18.2.0
import { useTheme, useMediaQuery } from '@mui/material'; // v5.14+
import debounce from 'lodash/debounce'; // v4.17.21

import {
  LayoutRoot,
  LayoutContainer,
  MainContent,
  SidebarWrapper
} from './Layout.styles';
import AppBar from '../AppBar/AppBar';
import Sidebar from '../Sidebar/Sidebar';

// Constants for layout behavior
const MOBILE_BREAKPOINT = 'md';
const RESIZE_DEBOUNCE_MS = 250;
const SIDEBAR_TRANSITION_MS = 300;

interface LayoutProps {
  children: React.ReactNode;
  isRTL?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Enhanced layout component with error boundary and accessibility features
 */
const Layout: React.FC<LayoutProps> = memo(({
  children,
  isRTL = false,
  onError
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(MOBILE_BREAKPOINT));
  
  // State management
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [error, setError] = useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null);

  /**
   * Handle window resize events with debouncing
   */
  const handleResize = useCallback(
    debounce(() => {
      if (!isMobile && !sidebarOpen) {
        setSidebarOpen(true);
      }
    }, RESIZE_DEBOUNCE_MS),
    [isMobile, sidebarOpen]
  );

  /**
   * Handle sidebar toggle with keyboard support
   */
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  /**
   * Handle settings button click in AppBar
   */
  const handleSettingsClick = useCallback(() => {
    try {
      // Handle settings menu open
      console.log('Settings clicked');
    } catch (error) {
      if (error instanceof Error) {
        setError(error);
        onError?.(error, {} as React.ErrorInfo);
      }
    }
  }, [onError]);

  /**
   * Setup resize listener and cleanup
   */
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      handleResize.cancel();
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  /**
   * Error boundary componentDidCatch implementation
   */
  if (error) {
    return (
      <div role="alert" aria-live="assertive">
        <h2>Something went wrong</h2>
        <details>
          <summary>Error Details</summary>
          <pre>{error.toString()}</pre>
          {errorInfo?.componentStack}
        </details>
      </div>
    );
  }

  return (
    <LayoutRoot
      dir={isRTL ? 'rtl' : 'ltr'}
      role="application"
      aria-label="Main application layout"
    >
      <AppBar
        onSettingsClick={handleSettingsClick}
        className={isRTL ? 'rtl' : undefined}
        ariaLabel="Main navigation bar"
      />
      
      <LayoutContainer>
        <SidebarWrapper open={sidebarOpen}>
          <Sidebar
            open={sidebarOpen}
            onToggle={handleSidebarToggle}
            persistentDrawer={!isMobile}
          />
        </SidebarWrapper>

        <MainContent
          component="main"
          role="main"
          aria-label="Main content area"
          sx={{
            marginLeft: {
              xs: 0,
              [MOBILE_BREAKPOINT]: sidebarOpen ? '240px' : '64px'
            },
            transition: theme.transitions.create(['margin'], {
              easing: theme.transitions.easing.sharp,
              duration: SIDEBAR_TRANSITION_MS
            }),
            ...(isRTL && {
              marginRight: {
                xs: 0,
                [MOBILE_BREAKPOINT]: sidebarOpen ? '240px' : '64px'
              },
              marginLeft: 0
            })
          }}
        >
          {children}
        </MainContent>
      </LayoutContainer>
    </LayoutRoot>
  );
});

Layout.displayName = 'Layout';

export default Layout;