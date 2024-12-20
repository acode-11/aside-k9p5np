import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axe } from '@axe-core/react';
import AppBar from './AppBar';
import GlobalSearch from '../GlobalSearch/GlobalSearch';
import { useAuth } from '../../../hooks/useAuth';

// Mock dependencies
vi.mock('../../../hooks/useAuth');
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));
vi.mock('../../../hooks/useNotifications', () => ({
  useNotifications: () => ({
    showNotification: vi.fn(),
  }),
}));

// Enhanced mock implementation of useAuth hook
const mockAuthHook = (mockValues = {}) => {
  const defaultValues = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    logout: vi.fn(),
  };
  return {
    ...defaultValues,
    ...mockValues,
  };
};

// Helper function to render component with all necessary providers
const renderWithProviders = (
  ui,
  {
    theme = 'light',
    route = '/',
    initialState = {},
  } = {}
) => {
  return render(ui);
};

describe('AppBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering and Layout', () => {
    it('should render with all core elements', () => {
      const mockAuth = mockAuthHook();
      vi.mocked(useAuth).mockReturnValue(mockAuth);

      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);

      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByAltText('AI-Powered Detection Platform')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    it('should apply correct Material Design styles', () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      const appBar = screen.getByRole('banner');
      
      const styles = window.getComputedStyle(appBar);
      expect(styles.position).toBe('fixed');
      expect(styles.zIndex).toBe('1100');
      expect(styles.width).toBe('100%');
    });

    it('should be responsive across breakpoints', async () => {
      const { container } = renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      
      // Test mobile view
      window.innerWidth = 360;
      fireEvent(window, new Event('resize'));
      await waitFor(() => {
        const toolbar = container.querySelector('.MuiToolbar-root');
        expect(window.getComputedStyle(toolbar).minHeight).toBe('56px');
      });

      // Test desktop view
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      await waitFor(() => {
        const toolbar = container.querySelector('.MuiToolbar-root');
        expect(window.getComputedStyle(toolbar).minHeight).toBe('64px');
      });
    });
  });

  describe('Authentication States', () => {
    it('should display user avatar when authenticated', () => {
      const mockUser = {
        firstName: 'John',
        lastName: 'Doe',
      };
      const mockAuth = mockAuthHook({ user: mockUser, isAuthenticated: true });
      vi.mocked(useAuth).mockReturnValue(mockAuth);

      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      
      expect(screen.getByText('J')).toBeInTheDocument();
      expect(screen.getByLabelText('Account menu')).toBeInTheDocument();
    });

    it('should display generic icon when not authenticated', () => {
      const mockAuth = mockAuthHook({ isAuthenticated: false });
      vi.mocked(useAuth).mockReturnValue(mockAuth);

      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      
      expect(screen.queryByText('J')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Account menu')).toBeInTheDocument();
    });

    it('should handle logout process', async () => {
      const mockLogout = vi.fn();
      const mockAuth = mockAuthHook({
        user: { firstName: 'John', lastName: 'Doe' },
        isAuthenticated: true,
        logout: mockLogout,
      });
      vi.mocked(useAuth).mockReturnValue(mockAuth);

      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);

      const menuButton = screen.getByLabelText('Account menu');
      await userEvent.click(menuButton);

      const logoutButton = screen.getByText('Logout');
      await userEvent.click(logoutButton);

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should open and close user menu', async () => {
      const mockAuth = mockAuthHook({
        user: { firstName: 'John', lastName: 'Doe' },
        isAuthenticated: true,
      });
      vi.mocked(useAuth).mockReturnValue(mockAuth);

      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);

      const menuButton = screen.getByLabelText('Account menu');
      await userEvent.click(menuButton);
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      await userEvent.click(document.body);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should handle settings click', async () => {
      const onSettingsClick = vi.fn();
      renderWithProviders(<AppBar onSettingsClick={onSettingsClick} />);

      const settingsButton = screen.getByLabelText('Open settings');
      await userEvent.click(settingsButton);

      expect(onSettingsClick).toHaveBeenCalled();
    });

    it('should handle notifications', async () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);

      const notificationButton = screen.getByLabelText(/notifications/i);
      await userEvent.click(notificationButton);

      expect(screen.getByText('No new notifications')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should render search component', () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('should pass correct props to GlobalSearch', () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      const searchInput = screen.getByPlaceholderText('Search detections...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should pass accessibility checks', async () => {
      const { container } = renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support keyboard navigation', async () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);

      const menuButton = screen.getByLabelText('Account menu');
      await userEvent.tab();
      expect(screen.getByRole('search')).toHaveFocus();
      
      await userEvent.tab();
      expect(screen.getByLabelText(/notifications/i)).toHaveFocus();
      
      await userEvent.tab();
      expect(screen.getByLabelText('Open settings')).toHaveFocus();
      
      await userEvent.tab();
      expect(menuButton).toHaveFocus();
    });

    it('should have proper ARIA attributes', () => {
      renderWithProviders(<AppBar onSettingsClick={vi.fn()} />);
      
      expect(screen.getByRole('banner')).toHaveAttribute('aria-label', 'Application navigation bar');
      expect(screen.getByRole('search')).toHaveAttribute('aria-label', 'search detections');
      expect(screen.getByLabelText('Account menu')).toHaveAttribute('aria-haspopup', 'true');
    });
  });
});