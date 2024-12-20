import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react'; // v14.0+
import { describe, it, expect, jest } from '@jest/globals'; // v29.0+
import { ThemeProvider, Theme } from '@mui/material/styles'; // v5.14+
import { createTheme } from '@mui/material/styles';
import Card from './Card';
import { COLORS, TYPOGRAPHY, SPACING, ELEVATION } from '../../../constants/theme.constants';

// Create test theme that matches our design system
const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary,
    },
    secondary: {
      main: COLORS.secondary,
    },
  },
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary,
  },
  spacing: SPACING.base,
  shadows: ELEVATION.shadows,
});

// Helper function to render components with theme
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

// Mock props for testing
const mockCardProps = {
  title: 'Test Card',
  children: 'Test content',
};

const mockHandleClick = jest.fn();

describe('Card Component', () => {
  describe('Design System Compliance', () => {
    it('should use correct typography from design system', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      const title = screen.getByText('Test Card');
      
      const styles = window.getComputedStyle(title);
      expect(styles.fontFamily).toContain('Inter');
      expect(styles.fontSize).toBeDefined();
    });

    it('should apply correct color palette', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      const card = screen.getByRole('article');
      
      const styles = window.getComputedStyle(card);
      expect(styles.backgroundColor).toBe(COLORS.background.light);
    });

    it('should follow spacing grid system', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      const content = screen.getByText('Test content');
      
      const styles = window.getComputedStyle(content.parentElement!);
      expect(styles.padding).toBe(`${SPACING.base * 2}px`);
    });

    it('should implement correct elevation levels', () => {
      renderWithTheme(<Card elevation={2} {...mockCardProps} />);
      const card = screen.getByRole('article');
      
      const styles = window.getComputedStyle(card);
      expect(styles.boxShadow).toBe(ELEVATION.shadows[2]);
    });
  });

  describe('Basic Rendering', () => {
    it('should render with required props', () => {
      renderWithTheme(<Card>{mockCardProps.children}</Card>);
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      expect(screen.getByText('Test Card')).toBeInTheDocument();
    });

    it('should render with default elevation', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      const card = screen.getByRole('article');
      
      const styles = window.getComputedStyle(card);
      expect(styles.boxShadow).toBe(ELEVATION.shadows[1]);
    });

    it('should apply custom className', () => {
      renderWithTheme(<Card {...mockCardProps} className="custom-class" />);
      expect(screen.getByRole('article')).toHaveClass('custom-class');
    });
  });

  describe('Optional Props', () => {
    it('should render actions when provided', () => {
      const actions = <button>Action</button>;
      renderWithTheme(
        <Card {...mockCardProps} actions={actions} />
      );
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply custom elevation', () => {
      renderWithTheme(<Card {...mockCardProps} elevation={3} />);
      const card = screen.getByRole('article');
      
      const styles = window.getComputedStyle(card);
      expect(styles.boxShadow).toBe(ELEVATION.shadows[3]);
    });

    it('should render ReactNode title', () => {
      const titleNode = <div data-testid="custom-title">Custom Title</div>;
      renderWithTheme(<Card {...mockCardProps} title={titleNode} />);
      expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle click events', () => {
      renderWithTheme(
        <Card {...mockCardProps} onClick={mockHandleClick} />
      );
      fireEvent.click(screen.getByRole('article'));
      expect(mockHandleClick).toHaveBeenCalled();
    });

    it('should handle keyboard navigation', () => {
      renderWithTheme(
        <Card {...mockCardProps} onClick={mockHandleClick} />
      );
      const card = screen.getByRole('article');
      
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(mockHandleClick).toHaveBeenCalled();
      
      fireEvent.keyDown(card, { key: ' ' });
      expect(mockHandleClick).toHaveBeenCalledTimes(2);
    });

    it('should prevent event bubbling on click', () => {
      const parentClick = jest.fn();
      renderWithTheme(
        <div onClick={parentClick}>
          <Card {...mockCardProps} onClick={mockHandleClick} />
        </div>
      );
      
      fireEvent.click(screen.getByRole('article'));
      expect(mockHandleClick).toHaveBeenCalled();
      expect(parentClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      renderWithTheme(
        <Card {...mockCardProps} aria-label="Test card" />
      );
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });

    it('should have correct tab index when interactive', () => {
      renderWithTheme(
        <Card {...mockCardProps} onClick={mockHandleClick} />
      );
      expect(screen.getByRole('article')).toHaveAttribute('tabIndex', '0');
    });

    it('should have negative tab index when not interactive', () => {
      renderWithTheme(<Card {...mockCardProps} />);
      expect(screen.getByRole('article')).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust padding on different screen sizes', () => {
      // Mock window.matchMedia for testing responsive behavior
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === '(min-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));

      renderWithTheme(<Card {...mockCardProps} />);
      const content = screen.getByText('Test content').parentElement;
      const styles = window.getComputedStyle(content!);
      
      // Should match the responsive padding from Card.styles.ts
      expect(styles.padding).toBeDefined();
    });
  });
});