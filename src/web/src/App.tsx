/**
 * @fileoverview Root application component providing the main application structure,
 * routing configuration, theme provider, error boundaries, and enhanced global state management.
 * @version 1.0.0
 */

import React, { useEffect, useMemo } from 'react';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline, useMediaQuery, createTheme } from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';

import Layout from './components/common/Layout/Layout';
import store from './store';
import { ROUTES, ROUTE_CONFIG } from './constants/routes.constants';
import { BREAKPOINTS, COLORS, TYPOGRAPHY } from './constants/theme.constants';
import { useAuth } from './hooks/useAuth';

// Lazy load route components for code splitting
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DetectionLibrary = React.lazy(() => import('./pages/DetectionLibrary'));
const DetectionDetail = React.lazy(() => import('./pages/DetectionDetail'));
const DetectionEditor = React.lazy(() => import('./pages/DetectionEditor'));
const Community = React.lazy(() => import('./pages/Community'));
const Analytics = React.lazy(() => import('./pages/Analytics'));
const Settings = React.lazy(() => import('./pages/Settings'));

/**
 * Error fallback component for error boundary
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Something went wrong</h2>
    <pre style={{ color: 'red' }}>{error.message}</pre>
    <button onClick={() => window.location.reload()}>Reload Application</button>
  </div>
);

/**
 * Protected route wrapper component with authentication check
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(ROUTES.ROOT);
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return isAuthenticated ? <>{children}</> : null;
};

/**
 * Enhanced root application component with error boundaries and performance optimization
 */
const App: React.FC = React.memo(() => {
  // Theme preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Create theme with responsive breakpoints and color scheme
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
          primary: {
            main: COLORS.primary,
          },
          secondary: {
            main: COLORS.secondary,
          },
          error: {
            main: COLORS.error,
          },
          background: {
            default: prefersDarkMode ? COLORS.background.dark : COLORS.background.light,
          },
        },
        typography: {
          fontFamily: TYPOGRAPHY.fontFamily.primary,
          fontSize: parseInt(TYPOGRAPHY.fontSize.base),
        },
        breakpoints: {
          values: BREAKPOINTS.values,
        },
      }),
    [prefersDarkMode]
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <Layout>
              <React.Suspense fallback={<div>Loading...</div>}>
                <Routes>
                  {/* Public routes */}
                  <Route path={ROUTES.ROOT} element={<Dashboard />} />

                  {/* Protected routes */}
                  <Route
                    path={ROUTES.DASHBOARD}
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.DETECTION_LIBRARY}
                    element={
                      <ProtectedRoute>
                        <DetectionLibrary />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.DETECTION_DETAIL}
                    element={
                      <ProtectedRoute>
                        <DetectionDetail />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.DETECTION_EDITOR}
                    element={
                      <ProtectedRoute>
                        <DetectionEditor />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.COMMUNITY}
                    element={
                      <ProtectedRoute>
                        <Community />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.ANALYTICS}
                    element={
                      <ProtectedRoute>
                        <Analytics />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path={ROUTES.SETTINGS}
                    element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    }
                  />

                  {/* Fallback route */}
                  <Route path="*" element={<div>Page not found</div>} />
                </Routes>
              </React.Suspense>
            </Layout>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
});

App.displayName = 'App';

export default App;