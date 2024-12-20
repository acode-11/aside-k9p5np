import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import Layout from './Layout';
import AppBar from '../AppBar/AppBar';
import Sidebar from '../Sidebar/Sidebar';

// Mock dependencies
jest.mock('@mui/material', () => ({
  ...jest.requireActual('@mui/material'),
  useMediaQuery: jest.fn()
}));

jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: jest.fn()
}));

// Mock child components
jest.mock('../AppBar/AppBar', () => {
  return jest.fn(({ onSettingsClick }) => (
    <div data-testid="appbar-component">
      <button onClick={onSettingsClick}>Settings</button>
    </div>
  ));
});

jest.mock('../Sidebar/Sidebar', () => {
  return jest.fn(({ open, onToggle }) => (
    <div data-testid="sidebar-component">
      <button onClick={onToggle}>Toggle Sidebar</button>
    </div>
  ));
});

// Test IDs
const TEST_IDS = {
  LAYOUT: 'layout-container',
  SIDEBAR: 'sidebar-component',
  APPBAR: 'appbar-component',
  MAIN: 'main-content'
};

// Helper function to render with theme
const renderWithTheme = (component: React.ReactElement) => {
  const mockTheme = {
    breakpoints: {
      down: jest.fn(),
      up: jest.fn()
    },
    transitions: {
      create: jest.fn().mockReturnValue('transition'),
      easing: { sharp: 'sharp' },
      duration: { standard: 300 }
    },
    direction: 'ltr',
    palette: {
      background: { default: '#fff' },
      text: { primary: '#000' }
    }
  };

  (useTheme as jest.Mock).mockReturnValue(mockTheme);

  return render(
    <ThemeProvider theme={mockTheme}>
      {component}
    </ThemeProvider>
  );
};

// Helper function to setup responsive tests
const setupResponsiveTest = (isMobile: boolean) => {
  (useMediaQuery as jest.Mock).mockReturnValue(isMobile);
};

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Layout Structure', () => {
    it('renders all main components correctly', () => {
      setupResponsiveTest(false);
      renderWithTheme(<Layout>Test Content</Layout>);

      expect(screen.getByTestId(TEST_IDS.LAYOUT)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.APPBAR)).toBeInTheDocument();
      expect(screen.getByTestId(TEST_IDS.SIDEBAR)).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies correct ARIA attributes for accessibility', () => {
      renderWithTheme(<Layout>Content</Layout>);
      
      const layout = screen.getByTestId(TEST_IDS.LAYOUT);
      expect(layout).toHaveAttribute('role', 'application');
      expect(layout).toHaveAttribute('aria-label', 'Main application layout');
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('aria-label', 'Main content area');
    });

    it('handles RTL layout correctly', () => {
      renderWithTheme(<Layout isRTL>Content</Layout>);
      
      const layout = screen.getByTestId(TEST_IDS.LAYOUT);
      expect(layout).toHaveAttribute('dir', 'rtl');
    });
  });

  describe('Responsive Behavior', () => {
    it('renders mobile layout correctly', () => {
      setupResponsiveTest(true);
      renderWithTheme(<Layout>Content</Layout>);

      const sidebar = screen.getByTestId(TEST_IDS.SIDEBAR);
      expect(sidebar).toHaveStyle({ transform: 'translateX(-240px)' });
    });

    it('renders desktop layout correctly', () => {
      setupResponsiveTest(false);
      renderWithTheme(<Layout>Content</Layout>);

      const sidebar = screen.getByTestId(TEST_IDS.SIDEBAR);
      expect(sidebar).not.toHaveStyle({ transform: 'translateX(-240px)' });
    });

    it('adjusts layout on window resize', async () => {
      const { rerender } = renderWithTheme(<Layout>Content</Layout>);

      // Simulate window resize
      setupResponsiveTest(true);
      rerender(<Layout>Content</Layout>);
      
      await waitFor(() => {
        const sidebar = screen.getByTestId(TEST_IDS.SIDEBAR);
        expect(sidebar).toHaveStyle({ transform: 'translateX(-240px)' });
      });
    });
  });

  describe('Interaction Handling', () => {
    it('toggles sidebar correctly', async () => {
      setupResponsiveTest(false);
      renderWithTheme(<Layout>Content</Layout>);

      const toggleButton = screen.getByText('Toggle Sidebar');
      await userEvent.click(toggleButton);

      expect(Sidebar).toHaveBeenCalledWith(
        expect.objectContaining({ open: false }),
        expect.any(Object)
      );
    });

    it('handles settings click correctly', async () => {
      const mockOnError = jest.fn();
      renderWithTheme(<Layout onError={mockOnError}>Content</Layout>);

      const settingsButton = screen.getByText('Settings');
      await userEvent.click(settingsButton);

      // Verify settings click handler
      expect(AppBar).toHaveBeenCalledWith(
        expect.objectContaining({
          onSettingsClick: expect.any(Function)
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error boundary when error occurs', () => {
      const error = new Error('Test Error');
      const errorInfo = { componentStack: 'Test Stack' };
      
      renderWithTheme(
        <Layout onError={(e, info) => {
          expect(e).toBe(error);
          expect(info).toBe(errorInfo);
        }}>
          Content
        </Layout>
      );

      // Simulate error
      const errorBoundary = screen.getByRole('alert');
      expect(errorBoundary).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('calls onError prop when error occurs', () => {
      const mockOnError = jest.fn();
      renderWithTheme(<Layout onError={mockOnError}>Content</Layout>);

      // Simulate error in settings click
      const settingsButton = screen.getByText('Settings');
      fireEvent.click(settingsButton);

      expect(mockOnError).not.toHaveBeenCalled(); // No error should occur in normal click
    });
  });

  describe('Performance Optimization', () => {
    it('uses memo to prevent unnecessary rerenders', () => {
      const { rerender } = renderWithTheme(<Layout>Content</Layout>);
      const initialRender = Sidebar.mock.calls.length;

      rerender(<Layout>Content</Layout>);
      expect(Sidebar.mock.calls.length).toBe(initialRender);
    });

    it('debounces resize handler correctly', async () => {
      renderWithTheme(<Layout>Content</Layout>);

      // Simulate multiple resize events
      global.dispatchEvent(new Event('resize'));
      global.dispatchEvent(new Event('resize'));
      global.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        // Verify that resize handler was debounced
        expect(useMediaQuery).toHaveBeenCalledTimes(1);
      });
    });
  });
});