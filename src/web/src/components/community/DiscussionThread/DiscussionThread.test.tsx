/**
 * @fileoverview Comprehensive test suite for the DiscussionThread component,
 * validating rendering, interactions, accessibility, and real-time updates.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React from 'react'; // v18.2+
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import userEvent from '@testing-library/user-event'; // v14.0+
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // v0.34+
import { axe, toHaveNoViolations } from 'jest-axe'; // v4.7+
import { ThemeProvider } from '@mui/material'; // v5.14+

import DiscussionThread from './DiscussionThread';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { createTheme } from '@mui/material/styles';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock WebSocket hook
vi.mock('../../../hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(() => ({
    status: 'CONNECTED',
    isConnected: true,
    send: vi.fn(),
    subscribe: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn()
  }))
}));

// Mock ResizeObserver
const mockResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
window.ResizeObserver = mockResizeObserver;

// Default test props
const mockThreadProps = {
  id: 'test-thread-1',
  title: 'Test Thread',
  content: 'Test content',
  author: {
    id: 'user-1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'CONTRIBUTOR',
    organizationId: 'org-1',
    teamIds: ['team-1'],
    platformPermissions: {},
    preferences: {},
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  createdAt: new Date('2023-01-01T00:00:00Z'),
  replyCount: 5,
  likeCount: 10,
  onReply: vi.fn(),
  onLike: vi.fn(),
  onShare: vi.fn(),
  wsConfig: {
    url: 'wss://test.com/ws',
    reconnectAttempts: 3
  }
};

// Mock handlers
const mockHandlers = {
  onReply: vi.fn(),
  onLike: vi.fn(),
  onShare: vi.fn(),
  onReport: vi.fn(),
  onEdit: vi.fn()
};

/**
 * Helper function to render component with necessary providers
 */
const renderWithProviders = (props = {}) => {
  const theme = createTheme({
    palette: {
      mode: 'light'
    }
  });

  return render(
    <ThemeProvider theme={theme}>
      <DiscussionThread {...mockThreadProps} {...props} />
    </ThemeProvider>
  );
};

describe('DiscussionThread Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders thread content correctly', () => {
      renderWithProviders();

      expect(screen.getByText(mockThreadProps.title)).toBeInTheDocument();
      expect(screen.getByText(mockThreadProps.content)).toBeInTheDocument();
      expect(screen.getByText(/5 replies/i)).toBeInTheDocument();
      expect(screen.getByText(/10 likes/i)).toBeInTheDocument();
    });

    it('renders loading skeleton when isLoading is true', () => {
      renderWithProviders({ isLoading: true });

      expect(screen.getAllByTestId('skeleton')).toHaveLength(4);
      expect(screen.queryByText(mockThreadProps.title)).not.toBeInTheDocument();
    });

    it('renders author information correctly', () => {
      renderWithProviders();

      const authorName = `${mockThreadProps.author.firstName} ${mockThreadProps.author.lastName}`;
      expect(screen.getByAltText(authorName)).toBeInTheDocument();
    });

    it('formats date correctly', () => {
      renderWithProviders();

      const formattedDate = screen.getByText(/January 1, 2023/i);
      expect(formattedDate).toBeInTheDocument();
      expect(formattedDate.tagName.toLowerCase()).toBe('time');
      expect(formattedDate).toHaveAttribute('dateTime', '2023-01-01T00:00:00.000Z');
    });
  });

  describe('Interactions', () => {
    it('handles like interaction correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const likeButton = screen.getByLabelText(/like thread/i);
      await user.click(likeButton);

      expect(mockThreadProps.onLike).toHaveBeenCalledWith(
        mockThreadProps.id,
        true
      );
      expect(likeButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('handles reply interaction correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const replyButton = screen.getByLabelText(/reply to thread/i);
      await user.click(replyButton);

      expect(mockThreadProps.onReply).toHaveBeenCalledWith(mockThreadProps.id);
    });

    it('handles share interaction correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const shareButton = screen.getByLabelText(/share thread/i);
      await user.click(shareButton);

      expect(mockThreadProps.onShare).toHaveBeenCalledWith(mockThreadProps.id);
    });

    it('disables interactions while updating', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Simulate updating state
      const likeButton = screen.getByLabelText(/like thread/i);
      await user.click(likeButton);

      // Verify buttons are disabled during update
      expect(likeButton).toBeDisabled();
      expect(screen.getByLabelText(/reply to thread/i)).toBeDisabled();
      expect(screen.getByLabelText(/share thread/i)).toBeDisabled();
    });
  });

  describe('WebSocket Integration', () => {
    it('shows connection status warning when disconnected', () => {
      (useWebSocket as jest.Mock).mockImplementationOnce(() => ({
        isConnected: false,
        status: 'DISCONNECTED'
      }));

      renderWithProviders();

      expect(screen.getByText(/real-time updates are currently unavailable/i))
        .toBeInTheDocument();
    });

    it('sends updates via WebSocket when connected', async () => {
      const mockWs = {
        isConnected: true,
        send: vi.fn(),
        status: 'CONNECTED'
      };
      (useWebSocket as jest.Mock).mockImplementationOnce(() => mockWs);

      const user = userEvent.setup();
      renderWithProviders();

      const likeButton = screen.getByLabelText(/like thread/i);
      await user.click(likeButton);

      expect(mockWs.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'THREAD_LIKE',
        payload: expect.objectContaining({
          threadId: mockThreadProps.id
        })
      }));
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 guidelines', async () => {
      const { container } = renderWithProviders();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText(/reply to thread/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/like thread/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/share thread/i)).toHaveFocus();
    });

    it('provides proper ARIA attributes', () => {
      renderWithProviders();

      const thread = screen.getByRole('article');
      expect(thread).toHaveAttribute('aria-labelledby', `thread-${mockThreadProps.id}-title`);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles interaction errors gracefully', async () => {
      const mockError = new Error('Test error');
      mockThreadProps.onLike.mockRejectedValueOnce(mockError);

      const user = userEvent.setup();
      renderWithProviders();

      const likeButton = screen.getByLabelText(/like thread/i);
      await user.click(likeButton);

      await waitFor(() => {
        expect(screen.getByText(/real-time updates are currently unavailable/i))
          .toBeInTheDocument();
      });
    });

    it('recovers from failed WebSocket connections', async () => {
      const mockWs = {
        isConnected: false,
        connect: vi.fn(),
        status: 'ERROR'
      };
      (useWebSocket as jest.Mock).mockImplementationOnce(() => mockWs);

      renderWithProviders();

      expect(screen.getByText(/real-time updates are currently unavailable/i))
        .toBeInTheDocument();
      expect(mockWs.connect).toHaveBeenCalled();
    });
  });
});