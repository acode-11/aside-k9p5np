import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Notification from './Notification';
import { uiActions } from '../../../store/slices/uiSlice';
import { COLORS } from '../../../constants/theme.constants';

// Constants for testing
const TEST_MESSAGE = 'Test notification message';
const TEST_IDS = {
  NOTIFICATION_CONTAINER: 'notification-container',
  CLOSE_BUTTON: 'notification-close-button',
};

// Helper function to render component with Redux and Theme providers
const renderWithRedux = (
  ui: React.ReactElement,
  {
    initialState = {},
    store = configureStore({
      reducer: {
        ui: (state = { notification: null }, action) => state,
      },
      preloadedState: initialState,
    }),
    theme = createTheme(),
    ...renderOptions
  } = {}
) => {
  const user = userEvent.setup();
  
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </Provider>
  );

  return {
    user,
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// Mock ResizeObserver for responsive testing
beforeAll(() => {
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
});

describe('Notification Component', () => {
  // Rendering Tests
  describe('Rendering', () => {
    it('renders different notification types with correct styling', async () => {
      const types = ['success', 'error', 'warning', 'info'] as const;
      
      for (const type of types) {
        const { store } = renderWithRedux(
          <Notification 
            type={type}
            message={TEST_MESSAGE}
            testId={TEST_IDS.NOTIFICATION_CONTAINER}
          />
        );

        // Trigger notification display
        store.dispatch(uiActions.showNotification({
          type,
          message: TEST_MESSAGE,
        }));

        const notification = await screen.findByTestId(TEST_IDS.NOTIFICATION_CONTAINER);
        
        // Verify correct styling based on type
        expect(notification).toHaveStyle({
          color: COLORS[type],
        });
        
        // Verify message content
        expect(screen.getByText(TEST_MESSAGE)).toBeInTheDocument();
        
        // Verify alert role and type
        const alert = within(notification).getByRole('alert');
        expect(alert).toHaveAttribute('severity', type);
      }
    });

    it('renders with custom position', () => {
      const { store } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        />
      );

      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: TEST_MESSAGE,
      }));

      const notification = screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER);
      expect(notification).toHaveStyle({
        bottom: '24px',
        left: '24px',
      });
    });
  });

  // Animation and Timing Tests
  describe('Animations and Timing', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-hides after specified duration', async () => {
      const duration = 3000;
      const { store } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
          duration={duration}
          autoHide
        />
      );

      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: TEST_MESSAGE,
      }));

      // Verify notification is shown
      expect(screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER)).toBeInTheDocument();

      // Fast-forward time
      jest.advanceTimersByTime(duration);

      // Verify notification is removed
      await waitFor(() => {
        expect(screen.queryByTestId(TEST_IDS.NOTIFICATION_CONTAINER)).not.toBeInTheDocument();
      });
    });

    it('stays visible when autoHide is false', async () => {
      const { store } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
          autoHide={false}
        />
      );

      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: TEST_MESSAGE,
      }));

      const notification = screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER);
      expect(notification).toBeInTheDocument();

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Notification should still be visible
      expect(notification).toBeInTheDocument();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets accessibility requirements', async () => {
      const { store } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
        />
      );

      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: TEST_MESSAGE,
      }));

      const notification = screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER);

      // Check ARIA attributes
      expect(notification).toHaveAttribute('role', 'alert');
      expect(notification).toHaveAttribute('aria-live', 'polite');
      
      // Verify close button accessibility
      const closeButton = screen.getByTestId(TEST_IDS.CLOSE_BUTTON);
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });

    it('handles keyboard interactions', async () => {
      const { store, user } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
        />
      );

      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: TEST_MESSAGE,
      }));

      const notification = screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER);

      // Test Escape key closes notification
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(notification).not.toBeInTheDocument();
      });
    });
  });

  // Redux Integration Tests
  describe('Redux Integration', () => {
    it('handles notification queue correctly', async () => {
      const { store } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
        />
      );

      // Dispatch multiple notifications
      store.dispatch(uiActions.showNotification({
        type: 'info',
        message: 'First notification',
      }));

      store.dispatch(uiActions.showNotification({
        type: 'success',
        message: 'Second notification',
      }));

      // Verify first notification is shown
      expect(screen.getByText('First notification')).toBeInTheDocument();

      // Close first notification
      fireEvent.click(screen.getByTestId(TEST_IDS.CLOSE_BUTTON));

      // Verify second notification appears
      await waitFor(() => {
        expect(screen.getByText('Second notification')).toBeInTheDocument();
      });
    });
  });

  // Theme Integration Tests
  describe('Theme Integration', () => {
    it('adapts to theme changes', () => {
      const darkTheme = createTheme({ palette: { mode: 'dark' } });
      
      const { rerender } = renderWithRedux(
        <Notification
          type="info"
          message={TEST_MESSAGE}
        />,
        {
          theme: darkTheme,
        }
      );

      const lightTheme = createTheme({ palette: { mode: 'light' } });
      
      rerender(
        <ThemeProvider theme={lightTheme}>
          <Notification
            type="info"
            message={TEST_MESSAGE}
          />
        </ThemeProvider>
      );

      // Verify theme-specific styles are applied
      const notification = screen.getByTestId(TEST_IDS.NOTIFICATION_CONTAINER);
      expect(notification).toHaveStyle({
        backgroundColor: lightTheme.palette.background.paper,
      });
    });
  });
});