/**
 * @fileoverview Root Redux store configuration implementing type-safe state management
 * with enhanced middleware, error handling, and development tools integration.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { configureStore, Middleware } from '@reduxjs/toolkit'; // v1.9.7
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'; // v8.1.3
import { authReducer } from './slices/authSlice';
import { detectionReducer } from './slices/detectionSlice';
import { platformReducer } from './slices/platformSlice';
import { uiReducer } from './slices/uiSlice';

/**
 * Custom error handling middleware
 */
const errorMiddleware: Middleware = () => (next) => (action) => {
  try {
    return next(action);
  } catch (error) {
    console.error('Redux Error:', error);
    // Re-throw error after logging to maintain error boundary functionality
    throw error;
  }
};

/**
 * Performance monitoring middleware
 */
const monitoringMiddleware: Middleware = () => (next) => (action) => {
  const start = performance.now();
  const result = next(action);
  const duration = performance.now() - start;

  if (duration > 16) { // Log slow actions (taking more than one frame)
    console.warn(`Slow action: ${action.type} took ${duration.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Load persisted state from localStorage
 */
const loadPersistedState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    if (!serializedState) return undefined;
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Failed to load persisted state:', error);
    return undefined;
  }
};

/**
 * State persistence enhancer
 */
const persistenceEnhancer = (createStore: any) => (
  reducer: any,
  initialState: any,
  enhancer: any
) => {
  const store = createStore(reducer, initialState, enhancer);

  store.subscribe(() => {
    try {
      const state = store.getState();
      localStorage.setItem('reduxState', JSON.stringify({
        auth: { user: state.auth.user },
        ui: { themeMode: state.ui.themeMode }
      }));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  });

  return store;
};

/**
 * Configure Redux store with enhanced middleware and type safety
 */
export const store = configureStore({
  reducer: {
    auth: authReducer,
    detection: detectionReducer,
    platform: platformReducer,
    ui: uiReducer
  },
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: false, // Disable for complex objects
      thunk: true,
      immutableCheck: true
    }).concat(errorMiddleware, monitoringMiddleware),
  preloadedState: loadPersistedState(),
  enhancers: (defaultEnhancers) => 
    defaultEnhancers.concat(persistenceEnhancer),
  devTools: process.env.NODE_ENV !== 'production'
});

// Type definitions for state and dispatch
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/**
 * Type-safe hooks for accessing store state and dispatch
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;