import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import Settings from './Settings';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/user.types';
import { PlatformService } from '../../services/platform.service';
import { createTestStore } from '../../utils/test.utils';

// Extend expect with accessibility matchers
expect.extend(toHaveNoViolations);

// Mock the auth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: vi.fn()
}));

// Mock platform service
vi.mock('../../services/platform.service', () => ({
  PlatformService: {
    updateIntegration: vi.fn(),
    testConnection: vi.fn()
  }
}));

describe('Settings Page', () => {
  // Test store setup
  let mockStore: any;

  // Mock user with different roles for testing
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.ADMIN,
    platformPermissions: {
      SIEM: { canView: true, canModify: true, canDeploy: true },
      EDR: { canView: true, canModify: true, canDeploy: true },
      NSM: { canView: true, canModify: true, canDeploy: true }
    },
    preferences: {
      theme: 'SYSTEM',
      notifications: 'IMPORTANT',
      defaultPlatform: 'SIEM',
      autoSave: true,
      syncEnabled: true,
      validationLevel: 'STRICT'
    }
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup auth mock with default admin user
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
      userRole: UserRole.ADMIN,
      updateSecurityPreferences: vi.fn()
    });

    // Initialize test store
    mockStore = createTestStore({
      auth: {
        user: mockUser,
        isAuthenticated: true
      }
    });
  });

  describe('Component Rendering', () => {
    it('should render all settings sections correctly', () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      // Verify all major sections are present
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Platform Settings')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('should meet accessibility standards', async () => {
      const { container } = render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should render loading skeleton when loading', () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: null,
        loading: true
      });

      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      expect(screen.getByTestId('settings-skeleton')).toBeInTheDocument();
    });
  });

  describe('Theme Settings', () => {
    it('should handle theme changes correctly', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const themeSelect = screen.getByLabelText(/theme/i);
      await userEvent.click(themeSelect);
      await userEvent.click(screen.getByText('Dark'));

      expect(mockUser.preferences.theme).toBe('DARK');
    });

    it('should persist theme changes', async () => {
      const updatePreferences = vi.fn();
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updateSecurityPreferences: updatePreferences
      });

      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const themeSelect = screen.getByLabelText(/theme/i);
      await userEvent.click(themeSelect);
      await userEvent.click(screen.getByText('Light'));

      expect(updatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({ theme: 'LIGHT' })
      );
    });
  });

  describe('Notification Settings', () => {
    it('should handle notification preference changes', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const notificationSelect = screen.getByLabelText(/notifications/i);
      await userEvent.click(notificationSelect);
      await userEvent.click(screen.getByText('All'));

      expect(mockUser.preferences.notifications).toBe('ALL');
    });

    it('should show validation error for invalid notification settings', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const notificationSelect = screen.getByLabelText(/notifications/i);
      fireEvent.change(notificationSelect, { target: { value: 'INVALID' } });

      expect(screen.getByText(/Invalid notification setting/i)).toBeInTheDocument();
    });
  });

  describe('Platform Settings', () => {
    it('should handle platform selection changes', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const platformSelect = screen.getByLabelText(/default platform/i);
      await userEvent.click(platformSelect);
      await userEvent.click(screen.getByText('EDR'));

      expect(mockUser.preferences.defaultPlatform).toBe('EDR');
    });

    it('should disable platforms without view permission', () => {
      const userWithLimitedAccess = {
        ...mockUser,
        platformPermissions: {
          ...mockUser.platformPermissions,
          EDR: { canView: false, canModify: false, canDeploy: false }
        }
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: userWithLimitedAccess,
        loading: false
      });

      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const platformSelect = screen.getByLabelText(/default platform/i);
      const edrOption = within(platformSelect).getByText('EDR');
      expect(edrOption).toBeDisabled();
    });
  });

  describe('Advanced Settings', () => {
    it('should handle validation level changes', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const validationSelect = screen.getByLabelText(/validation level/i);
      await userEvent.click(validationSelect);
      await userEvent.click(screen.getByText('Normal'));

      expect(mockUser.preferences.validationLevel).toBe('NORMAL');
    });

    it('should toggle auto-save setting', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const autoSaveSwitch = screen.getByRole('switch', { name: /auto-save/i });
      await userEvent.click(autoSaveSwitch);

      expect(mockUser.preferences.autoSave).toBe(false);
    });
  });

  describe('Role-based Access', () => {
    it('should restrict certain settings for non-admin users', () => {
      const regularUser = {
        ...mockUser,
        role: UserRole.READER
      };

      (useAuth as jest.Mock).mockReturnValue({
        user: regularUser,
        loading: false
      });

      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      // Advanced settings should be hidden for regular users
      expect(screen.queryByText('Advanced Settings')).not.toBeInTheDocument();
    });

    it('should show all settings for admin users', () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      // All sections should be visible for admin users
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      expect(screen.getByText('Platform Settings')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on save failure', async () => {
      const updatePreferences = vi.fn().mockRejectedValue(new Error('Save failed'));
      (useAuth as jest.Mock).mockReturnValue({
        user: mockUser,
        loading: false,
        updateSecurityPreferences: updatePreferences
      });

      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const saveButton = screen.getByText('Save Changes');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to save preferences/i)).toBeInTheDocument();
      });
    });

    it('should handle validation errors appropriately', async () => {
      render(
        <Provider store={mockStore}>
          <Settings />
        </Provider>
      );

      const validationSelect = screen.getByLabelText(/validation level/i);
      fireEvent.change(validationSelect, { target: { value: 'INVALID' } });

      expect(screen.getByText(/Invalid validation level/i)).toBeInTheDocument();
    });
  });
});