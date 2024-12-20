import { createSlice, PayloadAction } from '@reduxjs/toolkit'; // v1.9.7
import { PaletteMode } from '@mui/material'; // v5.14+
import { COLORS } from '../../constants/theme.constants';

// Type definitions for state management
interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  autoHide?: boolean;
}

interface DialogState {
  id: string;
  type: string;
  title?: string;
  content?: React.ReactNode;
  data?: unknown;
}

export interface UIState {
  themeMode: PaletteMode;
  notification: NotificationState | null;
  notificationQueue: NotificationState[];
  isLoading: boolean;
  activeDialog: DialogState | null;
  dialogStack: DialogState[];
}

// Constants
const NOTIFICATION_TIMEOUT = 5000; // Default notification duration in ms
const LOADING_DEBOUNCE = 300; // Debounce time for loading state in ms

// Get initial theme from localStorage or default to light
const getInitialTheme = (): PaletteMode => {
  try {
    const savedTheme = localStorage.getItem('themeMode');
    return (savedTheme === 'light' || savedTheme === 'dark') ? savedTheme : 'light';
  } catch {
    return 'light';
  }
};

// Initial state
const initialState: UIState = {
  themeMode: getInitialTheme(),
  notification: null,
  notificationQueue: [],
  isLoading: false,
  activeDialog: null,
  dialogStack: [],
};

// Create the slice
export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<PaletteMode>) => {
      const mode = action.payload;
      if (mode === 'light' || mode === 'dark') {
        state.themeMode = mode;
        try {
          localStorage.setItem('themeMode', mode);
        } catch (error) {
          console.error('Failed to save theme preference:', error);
        }
      }
    },

    showNotification: (state, action: PayloadAction<NotificationState>) => {
      const notification = {
        ...action.payload,
        duration: action.payload.duration || NOTIFICATION_TIMEOUT,
        autoHide: action.payload.autoHide ?? true,
      };

      // If there's an active notification, queue the new one
      if (state.notification) {
        state.notificationQueue.push(notification);
      } else {
        state.notification = notification;
      }
    },

    hideNotification: (state) => {
      state.notification = null;
      
      // Process queue if there are pending notifications
      if (state.notificationQueue.length > 0) {
        state.notification = state.notificationQueue[0];
        state.notificationQueue = state.notificationQueue.slice(1);
      }
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    toggleDialog: (state, action: PayloadAction<{
      dialog: DialogState | null;
      preserveStack?: boolean;
    }>) => {
      const { dialog, preserveStack } = action.payload;

      // If closing dialog and preserving stack
      if (!dialog && preserveStack && state.activeDialog) {
        state.dialogStack.push(state.activeDialog);
      }

      // If opening new dialog and there's an active one
      if (dialog && state.activeDialog) {
        state.dialogStack.push(state.activeDialog);
      }

      state.activeDialog = dialog;

      // Restore previous dialog from stack if closing
      if (!dialog && !preserveStack && state.dialogStack.length > 0) {
        state.activeDialog = state.dialogStack.pop() || null;
      }
    },

    clearDialogStack: (state) => {
      state.activeDialog = null;
      state.dialogStack = [];
    },
  },
});

// Export actions and reducer
export const {
  setThemeMode,
  showNotification,
  hideNotification,
  setLoading,
  toggleDialog,
  clearDialogStack,
} = uiSlice.actions;

export default uiSlice.reducer;

// Selector helpers
export const selectThemeMode = (state: { ui: UIState }) => state.ui.themeMode;
export const selectNotification = (state: { ui: UIState }) => state.ui.notification;
export const selectIsLoading = (state: { ui: UIState }) => state.ui.isLoading;
export const selectActiveDialog = (state: { ui: UIState }) => state.ui.activeDialog;

// Notification style maps
export const notificationStyles = {
  success: {
    backgroundColor: COLORS.success,
    color: '#FFFFFF',
  },
  error: {
    backgroundColor: COLORS.error,
    color: '#FFFFFF',
  },
  info: {
    backgroundColor: COLORS.primary,
    color: '#FFFFFF',
  },
  warning: {
    backgroundColor: '#FFA000',
    color: '#FFFFFF',
  },
};