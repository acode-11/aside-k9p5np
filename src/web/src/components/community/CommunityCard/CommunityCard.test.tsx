import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react'; // v14.0+
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7+
import { ThemeProvider } from '@mui/material/styles'; // v5.14+
import { createTheme } from '@mui/material'; // v5.14+
import CommunityCard from './CommunityCard';
import { UserRole, PlatformType } from '../../../types/user.types';
import { TYPOGRAPHY, COLORS, SPACING } from '../../../constants/theme.constants';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Create theme instance for testing
const theme = createTheme({
  typography: {
    fontFamily: TYPOGRAPHY.fontFamily.primary,
  },
  palette: {
    primary: {
      main: COLORS.primary,
    },
    secondary: {
      main: COLORS.secondary,
    },
  },
  spacing: SPACING.base,
});

// Default test props
const defaultProps = {
  id: 'test-community-1',
  name: 'Test Community',
  description: 'A test community description that should be truncated if it exceeds three lines of text. This helps test the text truncation functionality.',
  memberCount: 100,
  detectionCount: 50,
  discussionCount: 25,
  isFavorite: false,
  type: PlatformType.SIEM as const,
  userRole: UserRole.CONTRIBUTOR as const,
  onFavoriteToggle: jest.fn(),
};

// Helper function to render component with theme
const renderCommunityCard = (customProps = {}) => {
  const props = { ...defaultProps, ...customProps };
  return render(
    <ThemeProvider theme={theme}>
      <CommunityCard {...props} />
    </ThemeProvider>
  );
};

describe('CommunityCard Component', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders community information correctly', () => {
      renderCommunityCard();

      // Verify basic content
      expect(screen.getByText('Test Community')).toBeInTheDocument();
      expect(screen.getByText('A test community description')).toBeInTheDocument();
      expect(screen.getByText('SIEM')).toBeInTheDocument();
      
      // Verify metrics
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    it('applies correct typography styles', () => {
      renderCommunityCard();
      
      const title = screen.getByText('Test Community');
      const styles = window.getComputedStyle(title);
      
      expect(styles.fontFamily).toContain('Inter');
      expect(styles.fontSize).toBe(TYPOGRAPHY.fontSize.lg);
    });

    it('handles loading state correctly', () => {
      renderCommunityCard({ isLoading: true });
      
      expect(screen.getByTestId('community-card-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Community')).not.toBeInTheDocument();
    });

    it('truncates long descriptions', () => {
      renderCommunityCard({
        description: 'A'.repeat(300),
      });
      
      const description = screen.getByText(/A+/);
      const styles = window.getComputedStyle(description);
      
      expect(styles.display).toBe('-webkit-box');
      expect(styles.WebkitLineClamp).toBe('3');
    });
  });

  describe('Interactions', () => {
    it('handles favorite toggle correctly', async () => {
      const onFavoriteToggle = jest.fn();
      renderCommunityCard({ onFavoriteToggle });

      const favoriteButton = screen.getByLabelText('Favorite community');
      await fireEvent.click(favoriteButton);

      expect(onFavoriteToggle).toHaveBeenCalledWith('test-community-1');
    });

    it('applies hover styles on mouse over', () => {
      renderCommunityCard();
      
      const card = screen.getByRole('article');
      fireEvent.mouseEnter(card);
      
      const styles = window.getComputedStyle(card);
      expect(styles.transform).toBe('translateY(-2px)');
    });

    it('supports keyboard navigation', () => {
      renderCommunityCard();
      
      const card = screen.getByRole('article');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(card).toHaveFocus();
    });
  });

  describe('Role-based rendering', () => {
    it('shows admin badge for admin users', () => {
      renderCommunityCard({ userRole: UserRole.ADMIN });
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });

    it('hides favorite button for readers', () => {
      renderCommunityCard({ userRole: UserRole.READER });
      expect(screen.queryByLabelText(/favorite/i)).not.toBeInTheDocument();
    });

    it('shows correct type badge styles', () => {
      renderCommunityCard({ type: PlatformType.EDR });
      
      const badge = screen.getByText('EDR');
      const styles = window.getComputedStyle(badge);
      
      expect(styles.backgroundColor).toBe('transparent');
      expect(styles.border).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility guidelines', async () => {
      const { container } = renderCommunityCard();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      renderCommunityCard();
      
      expect(screen.getByRole('article')).toHaveAttribute(
        'aria-label',
        'Test Community community card'
      );
    });

    it('maintains proper focus management', () => {
      renderCommunityCard();
      
      const card = screen.getByRole('article');
      const favoriteButton = screen.getByLabelText(/favorite/i);
      
      favoriteButton.focus();
      fireEvent.keyDown(favoriteButton, { key: 'Tab' });
      
      expect(document.activeElement).not.toBe(favoriteButton);
    });
  });

  describe('Design System Compliance', () => {
    it('uses correct spacing values', () => {
      renderCommunityCard();
      
      const content = screen.getByText('A test community description');
      const styles = window.getComputedStyle(content.parentElement!);
      
      expect(styles.padding).toBe(`${SPACING.base * 2}px`);
    });

    it('applies correct elevation styles', () => {
      renderCommunityCard();
      
      const card = screen.getByRole('article');
      const styles = window.getComputedStyle(card);
      
      expect(styles.boxShadow).toBeTruthy();
    });

    it('uses theme colors correctly', () => {
      renderCommunityCard();
      
      const adminBadge = screen.getByText('SIEM');
      const styles = window.getComputedStyle(adminBadge);
      
      expect(styles.color).toBe(COLORS.text.primary);
    });
  });
});