import React from 'react'; // v18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // v4.7.3
import { ThemeProvider } from '@mui/material/styles'; // v5.14+
import { createTheme } from '@mui/material'; // v5.14+

// Internal imports
import PlatformSelector from './PlatformSelector';
import { PlatformType, IPlatform } from '../../../types/platform.types';
import { COLORS, TYPOGRAPHY } from '../../../constants/theme.constants';

// Mock the platform hook
vi.mock('../../../hooks/usePlatform', () => ({
  usePlatform: vi.fn(() => ({
    platforms: mockPlatforms,
    validatePlatformCapabilities: vi.fn().mockResolvedValue(true),
    isLoading: false,
    error: null
  }))
}));

// Mock theme for design system testing
const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary
    },
    text: {
      primary: COLORS.text.primary,
      secondary: COLORS.text.secondary
    }
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary
  }
});

// Test data
const mockPlatforms: IPlatform[] = [
  {
    id: 'siem-1',
    name: 'Test SIEM',
    type: PlatformType.SIEM,
    version: '8.0',
    capabilities: ['search', 'alert', 'dashboard']
  },
  {
    id: 'edr-1',
    name: 'Test EDR',
    type: PlatformType.EDR,
    version: '6.0',
    capabilities: ['endpoint', 'response', 'isolation']
  },
  {
    id: 'nsm-1',
    name: 'Test NSM',
    type: PlatformType.NSM,
    version: '4.0',
    capabilities: ['network', 'packet', 'flow']
  }
];

describe('PlatformSelector', () => {
  // Setup and teardown
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper function to render component with theme
  const renderWithTheme = (props = {}) => {
    return render(
      <ThemeProvider theme={theme}>
        <PlatformSelector
          onPlatformChange={vi.fn()}
          {...props}
        />
      </ThemeProvider>
    );
  };

  describe('Rendering and Design System Integration', () => {
    test('renders with correct design system styles', () => {
      renderWithTheme();
      const selector = screen.getByTestId('platform-selector');
      
      const styles = window.getComputedStyle(selector);
      expect(styles.fontFamily).toContain(TYPOGRAPHY.fontFamily.primary);
      expect(styles.color).toBe(COLORS.text.primary);
    });

    test('displays platform icons with correct styling', () => {
      renderWithTheme();
      const icons = screen.getAllByRole('img');
      
      icons.forEach(icon => {
        const styles = window.getComputedStyle(icon);
        expect(styles.width).toBe('24px');
        expect(styles.height).toBe('24px');
        expect(styles.marginRight).toBe('8px');
      });
    });
  });

  describe('Accessibility Compliance', () => {
    test('meets WCAG accessibility guidelines', async () => {
      const { container } = renderWithTheme();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('supports keyboard navigation', () => {
      renderWithTheme();
      const selector = screen.getByRole('combobox');
      
      // Focus the selector
      selector.focus();
      expect(document.activeElement).toBe(selector);
      
      // Open dropdown with keyboard
      fireEvent.keyDown(selector, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Navigate options
      fireEvent.keyDown(selector, { key: 'ArrowDown' });
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveFocus();
    });

    test('provides proper ARIA labels and descriptions', () => {
      renderWithTheme({ 'aria-label': 'Select security platform' });
      const selector = screen.getByRole('combobox');
      
      expect(selector).toHaveAttribute('aria-label', 'Select security platform');
      expect(selector).toHaveAttribute('aria-required', 'false');
      expect(selector).toHaveAttribute('aria-invalid', 'false');
    });
  });

  describe('Platform Selection Functionality', () => {
    test('displays all available platforms', () => {
      renderWithTheme();
      fireEvent.mouseDown(screen.getByRole('combobox'));
      
      mockPlatforms.forEach(platform => {
        expect(screen.getByText(platform.name)).toBeInTheDocument();
      });
    });

    test('handles platform selection correctly', async () => {
      const onPlatformChange = vi.fn();
      renderWithTheme({ onPlatformChange });
      
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Test SIEM'));
      
      await waitFor(() => {
        expect(onPlatformChange).toHaveBeenCalledWith(PlatformType.SIEM);
      });
    });

    test('validates platform capabilities on selection', async () => {
      const { usePlatform } = await import('../../../hooks/usePlatform');
      const validatePlatformCapabilities = vi.fn().mockResolvedValue(true);
      (usePlatform as jest.Mock).mockImplementation(() => ({
        platforms: mockPlatforms,
        validatePlatformCapabilities,
        isLoading: false,
        error: null
      }));

      renderWithTheme();
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Test SIEM'));

      await waitFor(() => {
        expect(validatePlatformCapabilities).toHaveBeenCalled();
      });
    });
  });

  describe('Loading and Error States', () => {
    test('displays loading indicator when processing', async () => {
      const { usePlatform } = await import('../../../hooks/usePlatform');
      (usePlatform as jest.Mock).mockImplementation(() => ({
        platforms: mockPlatforms,
        validatePlatformCapabilities: vi.fn().mockImplementation(() => new Promise(() => {})),
        isLoading: true,
        error: null
      }));

      renderWithTheme();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    test('displays error message on validation failure', async () => {
      const { usePlatform } = await import('../../../hooks/usePlatform');
      const errorMessage = 'Platform validation failed';
      (usePlatform as jest.Mock).mockImplementation(() => ({
        platforms: mockPlatforms,
        validatePlatformCapabilities: vi.fn().mockRejectedValue(new Error(errorMessage)),
        isLoading: false,
        error: errorMessage
      }));

      renderWithTheme();
      fireEvent.mouseDown(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Test SIEM'));

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Platform Management Integration', () => {
    test('syncs with external platform changes', async () => {
      const { rerender } = renderWithTheme({ selectedPlatform: PlatformType.SIEM });
      expect(screen.getByText('Test SIEM')).toBeInTheDocument();

      rerender(
        <ThemeProvider theme={theme}>
          <PlatformSelector
            selectedPlatform={PlatformType.EDR}
            onPlatformChange={vi.fn()}
          />
        </ThemeProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test EDR')).toBeInTheDocument();
      });
    });

    test('handles platform capability updates', async () => {
      const updatedPlatforms = [...mockPlatforms];
      updatedPlatforms[0].capabilities.push('new-capability');

      const { usePlatform } = await import('../../../hooks/usePlatform');
      (usePlatform as jest.Mock).mockImplementation(() => ({
        platforms: updatedPlatforms,
        validatePlatformCapabilities: vi.fn().mockResolvedValue(true),
        isLoading: false,
        error: null
      }));

      renderWithTheme();
      fireEvent.mouseDown(screen.getByRole('combobox'));
      
      expect(screen.getByText('Test SIEM')).toBeInTheDocument();
    });
  });
});