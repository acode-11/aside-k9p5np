import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import userEvent from '@testing-library/user-event'; // v14.0+
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'; // v29.0+
import { configureStore } from '@reduxjs/toolkit'; // v1.9+
import { Provider } from 'react-redux';
import { ThemeProvider, createTheme } from '@mui/material/styles'; // v5.14+
import { axe, toHaveNoViolations } from 'jest-axe'; // v7.0+
import Dialog from './Dialog';
import { uiSlice } from '../../../store/slices/uiSlice';
import { COLORS, TYPOGRAPHY, BREAKPOINTS } from '../../../constants/theme.constants';

expect.extend(toHaveNoViolations);

// Mock theme for consistent testing
const mockTheme = createTheme({
  breakpoints: {
    values: BREAKPOINTS.values
  },
  palette: {
    grey: {
      500: COLORS.text.secondary
    }
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary
  }
});

// Helper function to render Dialog with providers
const renderDialog = (props = {}, initialState = {}) => {
  const store = configureStore({
    reducer: {
      ui: uiSlice.reducer
    },
    preloadedState: {
      ui: {
        activeDialog: null,
        dialogStack: [],
        ...initialState
      }
    }
  });

  const defaultProps = {
    id: 'test-dialog',
    open: true,
    title: 'Test Dialog',
    children: <div>Dialog content</div>,
    onClose: jest.fn()
  };

  return {
    ...render(
      <Provider store={store}>
        <ThemeProvider theme={mockTheme}>
          <Dialog {...defaultProps} {...props} />
        </ThemeProvider>
      </Provider>
    ),
    store
  };
};

// Helper function for responsive testing
const setupResponsiveTest = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true });
  window.dispatchEvent(new Event('resize'));
};

describe('Dialog Component', () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dialog when open is true', () => {
      renderDialog({ open: true });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render dialog when open is false', () => {
      renderDialog({ open: false });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays provided title with correct typography', () => {
      renderDialog({ title: 'Custom Title' });
      const title = screen.getByText('Custom Title');
      expect(title).toHaveStyle({
        fontFamily: TYPOGRAPHY.fontFamily.primary,
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: TYPOGRAPHY.fontWeight.semibold
      });
    });

    it('applies correct elevation and backdrop styles', () => {
      renderDialog();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({
        boxShadow: expect.stringContaining('rgba(0, 0, 0, 0.1)')
      });
    });

    it('handles maxWidth prop correctly', () => {
      renderDialog({ maxWidth: 'xs' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('MuiDialog-paperWidthXs');
    });
  });

  describe('Interactions', () => {
    it('calls onClose when close button clicked', async () => {
      renderDialog({ onClose: onCloseMock });
      const closeButton = screen.getByLabelText('close');
      await userEvent.click(closeButton);
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('calls onClose when backdrop clicked', async () => {
      renderDialog({ onClose: onCloseMock });
      const backdrop = screen.getByRole('presentation').firstChild;
      await userEvent.click(backdrop as Element);
      expect(onCloseMock).toHaveBeenCalled();
    });

    it('prevents backdrop click when disableBackdropClick is true', async () => {
      renderDialog({ onClose: onCloseMock, disableEscapeKeyDown: true });
      const backdrop = screen.getByRole('presentation').firstChild;
      await userEvent.click(backdrop as Element);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it('maintains focus trap within dialog', async () => {
      renderDialog({
        children: (
          <>
            <button>First</button>
            <button>Second</button>
            <button>Third</button>
          </>
        )
      });

      const buttons = screen.getAllByRole('button');
      const firstButton = buttons[0];
      const lastButton = buttons[buttons.length - 1];

      // Tab from last to first
      firstButton.focus();
      fireEvent.keyDown(document.activeElement!, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(lastButton);

      // Tab from first to last
      lastButton.focus();
      fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      const { container } = renderDialog({
        ariaLabel: 'Test Dialog',
        ariaDescribedBy: 'dialog-description'
      });
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'Test Dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'dialog-description');
    });

    it('has no accessibility violations', async () => {
      const { container } = renderDialog();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('announces dialog to screen readers', async () => {
      renderDialog({ title: 'Accessible Dialog' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(screen.getByText('Accessible Dialog')).toHaveAttribute('id', 'test-dialog-title');
    });
  });

  describe('Responsive Behavior', () => {
    it('adjusts layout for mobile viewport', async () => {
      setupResponsiveTest(BREAKPOINTS.values.xs, 800);
      renderDialog();
      
      const closeButton = screen.getByLabelText('close');
      expect(closeButton).toHaveAttribute('size', 'small');
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({
        margin: '8px',
        width: 'calc(100% - 16px)'
      });
    });

    it('maintains proper spacing at breakpoints', async () => {
      setupResponsiveTest(BREAKPOINTS.values.md, 1000);
      renderDialog();
      
      const dialogContent = screen.getByRole('dialog').querySelector('.MuiDialogContent-root');
      expect(dialogContent).toHaveStyle({
        padding: '24px'
      });
    });
  });

  describe('Redux Integration', () => {
    it('updates dialog stack correctly', async () => {
      const { store } = renderDialog();
      
      const initialState = store.getState().ui;
      expect(initialState.dialogStack).toHaveLength(0);
      
      store.dispatch(uiSlice.actions.toggleDialog({
        dialog: { id: 'new-dialog', type: 'test' }
      }));
      
      const updatedState = store.getState().ui;
      expect(updatedState.dialogStack).toHaveLength(1);
    });

    it('cleans up state on unmount', async () => {
      const { store, unmount } = renderDialog();
      
      unmount();
      
      const finalState = store.getState().ui;
      expect(finalState.activeDialog).toBeNull();
      expect(finalState.dialogStack).toHaveLength(0);
    });
  });
});