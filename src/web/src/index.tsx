/**
 * @fileoverview Entry point for the AI-Powered Detection Platform frontend application.
 * Bootstraps the React application with necessary providers, error boundaries, and performance monitoring.
 * @version 1.0.0
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ErrorBoundary } from 'react-error-boundary';
import { reportWebVitals } from 'web-vitals';

import App from './App';
import store from './store';

/**
 * Error fallback component for critical application errors
 */
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div role="alert" style={{ padding: '20px', textAlign: 'center' }}>
    <h2>Critical Application Error</h2>
    <pre style={{ color: 'red', margin: '10px 0' }}>{error.message}</pre>
    <button 
      onClick={() => window.location.reload()}
      style={{ padding: '8px 16px', cursor: 'pointer' }}
    >
      Reload Application
    </button>
  </div>
);

/**
 * Initializes and renders the React application with error boundaries
 * and performance monitoring
 */
const renderApp = (): void => {
  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    throw new Error('Failed to find root element');
  }

  const root = createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onError={(error, errorInfo) => {
          // Log error to monitoring service
          console.error('Critical application error:', error, errorInfo);
        }}
      >
        <Provider store={store}>
          <App />
        </Provider>
      </ErrorBoundary>
    </React.StrictMode>
  );

  // Setup cleanup handler
  return () => {
    root.unmount();
  };
};

/**
 * Configure performance monitoring for core web vitals
 */
const setupPerformanceMonitoring = (): void => {
  reportWebVitals((metric) => {
    // Send metrics to analytics service
    const { name, value, id } = metric;
    
    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', { name, value, id });
    }

    // Configure performance thresholds
    const thresholds = {
      FCP: 2000, // First Contentful Paint
      LCP: 2500, // Largest Contentful Paint
      FID: 100,  // First Input Delay
      CLS: 0.1,  // Cumulative Layout Shift
      TTFB: 600  // Time to First Byte
    };

    // Check if metric exceeds threshold
    const threshold = thresholds[name as keyof typeof thresholds];
    if (threshold && value > threshold) {
      console.warn(`Performance threshold exceeded for ${name}: ${value}`);
    }
  });
};

// Initialize application
try {
  renderApp();
  setupPerformanceMonitoring();
} catch (error) {
  console.error('Failed to initialize application:', error);
  // Render minimal error state
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <h2>Failed to Load Application</h2>
        <p>Please try refreshing the page.</p>
      </div>
    `;
  }
}

// Enable hot module replacement in development
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept('./App', () => {
    console.log('Hot reloading application...');
    renderApp();
  });
}