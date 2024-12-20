// External imports - v14.0+ for testing libraries, v29.0+ for Jest
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material';

// Internal imports
import Button from './Button';
import { COLORS, TYPOGRAPHY, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

describe('Button Component', () => {
  // Setup test environment
  const mockTheme = createTheme();
  const user = userEvent.setup();
  
  // Mock functions
  const mockClick = jest.fn();
  const mockAsyncClick = jest.fn().mockImplementation(() => Promise.resolve());
  
  // Wrapper component with theme
  const renderWithTheme = (ui: React.ReactNode) => {
    return render(
      <ThemeProvider theme={mockTheme}>
        {ui}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockClick.mockClear();
    mockAsyncClick.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Button>Click me</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('applies correct typography', () => {
      renderWithTheme(<Button>Text</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle(`font-family: ${TYPOGRAPHY.fontFamily.primary}`);
    });

    it('maintains proper spacing', () => {
      renderWithTheme(<Button size="medium">Text</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveStyle(`padding: ${SPACING.scale[1]}px ${SPACING.scale[3]}px`);
    });

    it('handles long text properly', () => {
      const longText = 'This is a very long button text that should be handled properly';
      renderWithTheme(<Button>{longText}</Button>);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });

    it('renders icons correctly', () => {
      const StartIcon = () => <span data-testid="start-icon">→</span>;
      const EndIcon = () => <span data-testid="end-icon">←</span>;
      
      renderWithTheme(
        <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
          Icon Button
        </Button>
      );
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('supports full width mode', () => {
      renderWithTheme(<Button fullWidth>Full Width</Button>);
      expect(screen.getByRole('button')).toHaveClass('fullWidth');
    });
  });

  describe('Interaction', () => {
    it('handles click events', async () => {
      renderWithTheme(<Button onClick={mockClick}>Click me</Button>);
      await user.click(screen.getByRole('button'));
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard navigation', async () => {
      renderWithTheme(<Button onClick={mockClick}>Press me</Button>);
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('manages touch interactions', async () => {
      renderWithTheme(<Button onClick={mockClick}>Touch me</Button>);
      const button = screen.getByRole('button');
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      expect(mockClick).toHaveBeenCalledTimes(1);
    });

    it('prevents multiple clicks while loading', async () => {
      renderWithTheme(<Button loading onClick={mockClick}>Loading</Button>);
      await user.click(screen.getByRole('button'));
      expect(mockClick).not.toHaveBeenCalled();
    });

    it('handles async click operations', async () => {
      renderWithTheme(<Button onClick={mockAsyncClick}>Async</Button>);
      await user.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(mockAsyncClick).toHaveBeenCalledTimes(1);
      });
    });

    it('supports rapid clicking', async () => {
      renderWithTheme(<Button onClick={mockClick}>Rapid Click</Button>);
      const button = screen.getByRole('button');
      await user.tripleClick(button);
      expect(mockClick).toHaveBeenCalledTimes(3);
    });
  });

  describe('Styling', () => {
    it('applies variant styles correctly', () => {
      const { rerender } = renderWithTheme(<Button variant="contained">Contained</Button>);
      expect(screen.getByRole('button')).toHaveStyle(`background-color: ${COLORS.primary}`);

      rerender(<Button variant="outlined">Outlined</Button>);
      expect(screen.getByRole('button')).toHaveStyle(`border: 2px solid ${COLORS.primary}`);

      rerender(<Button variant="text">Text</Button>);
      expect(screen.getByRole('button')).toHaveStyle('background-color: transparent');
    });

    it('supports theme customization', () => {
      const customTheme = createTheme({
        palette: {
          primary: {
            main: '#FF0000',
          },
        },
      });

      render(
        <ThemeProvider theme={customTheme}>
          <Button>Themed</Button>
        </ThemeProvider>
      );
      
      expect(screen.getByRole('button')).toHaveStyle('background-color: #FF0000');
    });

    it('handles color variants', () => {
      const { rerender } = renderWithTheme(<Button color="error">Error</Button>);
      expect(screen.getByRole('button')).toHaveClass('error');

      rerender(<Button color="success">Success</Button>);
      expect(screen.getByRole('button')).toHaveClass('success');
    });

    it('maintains proper sizing', () => {
      const { rerender } = renderWithTheme(<Button size="small">Small</Button>);
      expect(screen.getByRole('button')).toHaveStyle('height: 32px');

      rerender(<Button size="large">Large</Button>);
      expect(screen.getByRole('button')).toHaveStyle('height: 48px');
    });

    it('supports custom classes', () => {
      renderWithTheme(<Button className="custom-class">Custom</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('handles RTL layout', () => {
      const rtlTheme = createTheme({
        direction: 'rtl',
      });

      render(
        <ThemeProvider theme={rtlTheme}>
          <Button startIcon={<span>→</span>}>RTL</Button>
        </ThemeProvider>
      );
      
      expect(screen.getByRole('button')).toHaveStyle('direction: rtl');
    });
  });

  describe('Accessibility', () => {
    it('includes proper ARIA attributes', async () => {
      renderWithTheme(<Button loading>Loading</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('supports screen readers', () => {
      renderWithTheme(
        <Button aria-label="Custom action">
          <span aria-hidden="true">Icon</span>
        </Button>
      );
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom action');
    });

    it('maintains focus management', async () => {
      renderWithTheme(
        <>
          <Button>First</Button>
          <Button>Second</Button>
        </>
      );
      
      const [firstButton, secondButton] = screen.getAllByRole('button');
      firstButton.focus();
      expect(firstButton).toHaveFocus();
      
      await user.tab();
      expect(secondButton).toHaveFocus();
    });

    it('handles disabled states', () => {
      renderWithTheme(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('has no accessibility violations', async () => {
      const { container } = renderWithTheme(<Button>Accessible</Button>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Responsive', () => {
    it('adapts to mobile viewports', () => {
      global.innerWidth = BREAKPOINTS.mobile;
      global.dispatchEvent(new Event('resize'));
      
      renderWithTheme(<Button>Mobile</Button>);
      expect(screen.getByRole('button')).toHaveStyle('min-height: 44px');
    });

    it('maintains touch targets', () => {
      renderWithTheme(<Button size="small">Touch</Button>);
      const button = screen.getByRole('button');
      const styles = window.getComputedStyle(button);
      const height = parseInt(styles.height);
      expect(height).toBeGreaterThanOrEqual(32); // Minimum touch target size
    });

    it('scales properly on resize', () => {
      const { rerender } = renderWithTheme(<Button>Resize</Button>);
      
      // Simulate desktop
      global.innerWidth = BREAKPOINTS.desktop;
      global.dispatchEvent(new Event('resize'));
      rerender(<Button>Resize</Button>);
      
      // Simulate mobile
      global.innerWidth = BREAKPOINTS.mobile;
      global.dispatchEvent(new Event('resize'));
      rerender(<Button>Resize</Button>);
      
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});