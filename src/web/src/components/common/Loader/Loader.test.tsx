import React from 'react';
import { render, screen, waitFor } from '@testing-library/react'; // @testing-library/react v14.0+
import { describe, it, expect, beforeEach } from '@jest/globals'; // @jest/globals v29.0+
import { ThemeProvider } from '@mui/material'; // @mui/material v5.14+
import { createTheme } from '@mui/material/styles';
import Loader from './Loader';
import { COLORS, SPACING } from '../../../constants/theme.constants';

// Test constants
const TEST_ID_LOADER = 'loader-component';
const DEFAULT_SIZE = 40;
const MIN_SIZE = 16;
const MAX_SIZE = 100;
const CUSTOM_COLOR = '#FF0000';
const ARIA_LABEL = 'Loading content';

// Mock matchMedia for reduced motion tests
const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
};

// Setup theme for testing
const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary
    }
  }
});

// Wrapper component with theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('Loader Component', () => {
  beforeEach(() => {
    // Reset matchMedia mock before each test
    mockMatchMedia(false);
  });

  it('renders without crashing with default props', () => {
    renderWithTheme(<Loader />);
    const loader = screen.getByRole('progressbar');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('aria-label', ARIA_LABEL);
    expect(loader).toHaveAttribute('aria-busy', 'true');
  });

  it('applies custom size correctly', () => {
    const customSize = 32;
    renderWithTheme(<Loader size={customSize} />);
    const spinner = screen.getByRole('progressbar').querySelector('div');
    expect(spinner).toHaveStyle({
      width: `${customSize}px`,
      height: `${customSize}px`
    });
  });

  it('clamps size within valid range', () => {
    // Test minimum size
    renderWithTheme(<Loader size={0} />);
    let spinner = screen.getByRole('progressbar').querySelector('div');
    expect(spinner).toHaveStyle({
      width: `${MIN_SIZE}px`,
      height: `${MIN_SIZE}px`
    });

    // Test maximum size
    renderWithTheme(<Loader size={200} />);
    spinner = screen.getByRole('progressbar').querySelector('div');
    expect(spinner).toHaveStyle({
      width: `${MAX_SIZE}px`,
      height: `${MAX_SIZE}px`
    });
  });

  it('applies custom color correctly', () => {
    renderWithTheme(<Loader color={CUSTOM_COLOR} />);
    const spinner = screen.getByRole('progressbar').querySelector('div');
    expect(spinner).toHaveStyle({
      borderTopColor: CUSTOM_COLOR
    });
  });

  it('handles fullScreen mode correctly', () => {
    renderWithTheme(<Loader fullScreen />);
    const container = screen.getByRole('progressbar');
    expect(container).toHaveStyle({
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(255, 255, 255, 0.9)'
    });
  });

  it('respects reduced motion preferences', async () => {
    mockMatchMedia(true);
    renderWithTheme(<Loader />);
    const spinner = screen.getByRole('progressbar').querySelector('div');
    
    await waitFor(() => {
      expect(spinner).toHaveStyle({
        animationPlayState: 'paused'
      });
    });
  });

  it('handles custom aria-label correctly', () => {
    const customLabel = 'Custom loading message';
    renderWithTheme(<Loader ariaLabel={customLabel} />);
    const loader = screen.getByRole('progressbar');
    expect(loader).toHaveAttribute('aria-label', customLabel);
  });

  it('integrates with theme correctly', () => {
    renderWithTheme(<Loader />);
    const spinner = screen.getByRole('progressbar').querySelector('div');
    expect(spinner).toHaveStyle({
      borderTopColor: COLORS.primary
    });
  });

  it('maintains minimum height from theme spacing', () => {
    renderWithTheme(<Loader />);
    const container = screen.getByRole('progressbar');
    expect(container).toHaveStyle({
      minHeight: `${SPACING.base * 6}px`
    });
  });

  it('applies high-DPI border adjustments', () => {
    // Mock window.devicePixelRatio
    Object.defineProperty(window, 'devicePixelRatio', {
      get: () => 2
    });

    renderWithTheme(<Loader />);
    const spinner = screen.getByRole('progressbar').querySelector('div');
    
    // Check if media query styles are applied
    const styles = window.getComputedStyle(spinner as Element);
    expect(styles.borderWidth).toBe('1.5px');
  });
});