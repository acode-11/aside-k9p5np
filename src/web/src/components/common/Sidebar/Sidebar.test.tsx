import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import mediaQuery from '@testing-library/dom';

import Sidebar from './Sidebar';
import { ROUTES } from '../../../constants/routes.constants';

// Mock hooks and dependencies
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', role: 'ADMIN' },
    isAuthenticated: true
  })
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/' })
  };
});

// Helper function to render component with required providers
const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/' } = {}
) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={{ direction: 'ltr', palette: { action: { selected: '#f5f5f5' } } }}>
        {ui}
      </ThemeProvider>
    </MemoryRouter>
  );
};

// Helper function to mock window.matchMedia
const createMatchMedia = (width: number) => {
  return (query: string): MediaQueryList => ({
    matches: query.includes(`(max-width: ${width}px)`),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  });
};

describe('Sidebar Component', () => {
  beforeEach(() => {
    window.matchMedia = createMatchMedia(1024);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders all navigation items when expanded', () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Detection Library')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders only icons when collapsed', () => {
      renderWithProviders(<Sidebar open={false} onToggle={() => {}} />);

      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Navigate to dashboard')).toBeInTheDocument();
    });

    it('applies correct ARIA labels', () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation');
      expect(screen.getByLabelText('Navigate to dashboard')).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('renders as temporary drawer on mobile', () => {
      window.matchMedia = createMatchMedia(600);
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      const drawer = screen.getByRole('presentation');
      expect(drawer).toHaveClass('MuiDrawer-temporary');
    });

    it('renders as permanent drawer on desktop', () => {
      window.matchMedia = createMatchMedia(1200);
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      const drawer = screen.getByRole('presentation');
      expect(drawer).toHaveClass('MuiDrawer-permanent');
    });

    it('handles collapse toggle correctly', () => {
      const onToggle = vi.fn();
      renderWithProviders(<Sidebar open={true} onToggle={onToggle} />);

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      fireEvent.click(toggleButton);

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Navigation', () => {
    it('highlights active route', () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />, {
        route: ROUTES.DASHBOARD
      });

      const dashboardItem = screen.getByText('Dashboard').closest('li');
      expect(dashboardItem).toHaveClass('Mui-selected');
    });

    it('handles navigation clicks', async () => {
      const navigate = vi.fn();
      vi.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);

      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      const dashboardLink = screen.getByText('Dashboard');
      await userEvent.click(dashboardLink);

      expect(navigate).toHaveBeenCalledWith(ROUTES.DASHBOARD);
    });
  });

  describe('Authentication', () => {
    it('renders auth-required items when authenticated', () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);
      expect(screen.getByText('Analytics')).toBeInTheDocument();
    });

    it('hides auth-required items when not authenticated', () => {
      vi.spyOn(require('../../../hooks/useAuth'), 'useAuth').mockReturnValue({
        isAuthenticated: false
      });

      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);
      expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('supports keyboard navigation', async () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      const nav = screen.getByRole('navigation');
      const items = within(nav).getAllByRole('button');

      // Focus first item
      items[0].focus();
      expect(document.activeElement).toBe(items[0]);

      // Navigate with keyboard
      await userEvent.keyboard('[Tab]');
      expect(document.activeElement).toBe(items[1]);
    });

    it('provides proper ARIA attributes', () => {
      renderWithProviders(<Sidebar open={true} onToggle={() => {}} />);

      const nav = screen.getByRole('navigation');
      expect(nav).toHaveAttribute('aria-label', 'Main navigation');

      const toggleButton = screen.getByRole('button', { name: /collapse sidebar/i });
      expect(toggleButton).toHaveAttribute('aria-label');
    });
  });

  describe('Theme Integration', () => {
    it('applies theme direction correctly', () => {
      const rtlTheme = {
        direction: 'rtl',
        palette: { action: { selected: '#f5f5f5' } }
      };

      render(
        <MemoryRouter>
          <ThemeProvider theme={rtlTheme}>
            <Sidebar open={true} onToggle={() => {}} />
          </ThemeProvider>
        </MemoryRouter>
      );

      const drawer = screen.getByRole('presentation');
      expect(drawer).toHaveStyle({ right: '0' });
    });

    it('applies theme colors correctly', () => {
      const customTheme = {
        direction: 'ltr',
        palette: {
          action: { selected: '#e3f2fd' },
          background: { paper: '#ffffff' }
        }
      };

      render(
        <MemoryRouter>
          <ThemeProvider theme={customTheme}>
            <Sidebar open={true} onToggle={() => {}} />
          </ThemeProvider>
        </MemoryRouter>
      );

      const selectedItem = screen.getByText('Dashboard').closest('li');
      expect(selectedItem).toHaveStyle({ backgroundColor: '#e3f2fd' });
    });
  });
});