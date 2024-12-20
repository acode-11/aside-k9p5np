/**
 * @fileoverview Comprehensive test suite for the Community page component validating
 * rendering, real-time interactions, WebSocket functionality, and Redux store integration.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React from 'react'; // v18.2+
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v14.0+
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'; // v0.34+
import { Provider } from 'react-redux'; // v8.1+
import { MemoryRouter, Routes, Route } from 'react-router-dom'; // v6.8+
import { configureStore } from '@reduxjs/toolkit'; // v1.9+

import Community from './Community';
import CommunityCard from '../../components/community/CommunityCard/CommunityCard';
import DiscussionThread from '../../components/community/DiscussionThread/DiscussionThread';
import WebSocketService from '../../services/websocket.service';
import { UserRole } from '../../types/user.types';
import { ApiError } from '../../types/api.types';

// Mock WebSocket service
vi.mock('../../services/websocket.service');

// Mock initial state for Redux store
const mockInitialState = {
  communities: {
    items: [
      {
        id: '1',
        name: 'SIEM Community',
        description: 'Community for SIEM detection sharing',
        memberCount: 1200,
        detectionCount: 450,
        discussionCount: 89,
        isFavorite: false,
        type: 'SIEM',
        userRole: UserRole.CONTRIBUTOR
      }
    ],
    loading: false,
    error: null
  },
  discussions: {
    threads: [
      {
        id: '1',
        title: 'Improving EDR Detection Rate',
        content: 'Discussion about improving EDR detection rates...',
        author: {
          id: 'user1',
          firstName: 'John',
          lastName: 'Doe'
        },
        createdAt: new Date(),
        replyCount: 23,
        likeCount: 45,
        isPinned: true
      }
    ],
    loading: false
  }
};

// Helper function to create test store
const createTestStore = (initialState = mockInitialState) => {
  return configureStore({
    reducer: {
      communities: (state = initialState.communities) => state,
      discussions: (state = initialState.discussions) => state
    }
  });
};

// Helper function to render with providers
const renderWithProviders = (
  ui: React.ReactElement,
  { 
    initialState = mockInitialState,
    store = createTestStore(initialState),
    route = '/community'
  } = {}
) => {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/community" element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('Community Page Component', () => {
  let mockWebSocket: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    mockWebSocket = new WebSocketService({}) as jest.Mocked<WebSocketService>;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the community page layout correctly', () => {
      renderWithProviders(<Community />);

      // Verify main sections
      expect(screen.getByText('Community Hub')).toBeInTheDocument();
      expect(screen.getByText('Communities')).toBeInTheDocument();
      expect(screen.getByText('Active Discussions')).toBeInTheDocument();
    });

    it('should display loading skeletons when data is being fetched', () => {
      renderWithProviders(<Community />, {
        initialState: {
          ...mockInitialState,
          communities: { ...mockInitialState.communities, loading: true }
        }
      });

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render community cards with correct data', async () => {
      renderWithProviders(<Community />);

      const communityCard = screen.getByText('SIEM Community');
      expect(communityCard).toBeInTheDocument();
      expect(screen.getByText('1,200 members')).toBeInTheDocument();
      expect(screen.getByText('450 detections')).toBeInTheDocument();
    });
  });

  describe('WebSocket Integration', () => {
    it('should establish WebSocket connection on mount', async () => {
      renderWithProviders(<Community />);

      await waitFor(() => {
        expect(WebSocketService.prototype.connect).toHaveBeenCalled();
      });
    });

    it('should handle WebSocket connection errors', async () => {
      const error = new ApiError({
        code: 'CONNECTION_ERROR',
        message: 'Failed to connect'
      });

      WebSocketService.prototype.connect.mockRejectedValueOnce(error);
      renderWithProviders(<Community />);

      await waitFor(() => {
        expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      });
    });

    it('should update community data on WebSocket message', async () => {
      renderWithProviders(<Community />);

      const mockMessage = {
        type: 'COMMUNITY_UPDATE',
        data: {
          id: '1',
          memberCount: 1300
        }
      };

      // Simulate WebSocket message
      mockWebSocket.emit('message', mockMessage);

      await waitFor(() => {
        expect(screen.getByText('1,300 members')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should handle community favorite toggle', async () => {
      renderWithProviders(<Community />);

      const favoriteButton = screen.getByLabelText(/favorite community/i);
      fireEvent.click(favoriteButton);

      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'COMMUNITY_FAVORITE',
            payload: expect.objectContaining({
              communityId: '1'
            })
          })
        );
      });
    });

    it('should handle discussion thread interactions', async () => {
      renderWithProviders(<Community />);

      const discussionThread = screen.getByText('Improving EDR Detection Rate');
      const replyButton = within(discussionThread).getByLabelText(/reply/i);
      
      fireEvent.click(replyButton);

      await waitFor(() => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'THREAD_REPLY'
          })
        );
      });
    });

    it('should handle create community button click', () => {
      renderWithProviders(<Community />);

      const createButton = screen.getByText('Create Community');
      fireEvent.click(createButton);

      expect(window.location.href).toContain('/communities/new');
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      const error = new ApiError({
        code: 'API_ERROR',
        message: 'Failed to fetch communities'
      });

      renderWithProviders(<Community />, {
        initialState: {
          ...mockInitialState,
          communities: { ...mockInitialState.communities, error }
        }
      });

      expect(screen.getByText(error.message)).toBeInTheDocument();
    });

    it('should handle WebSocket reconnection', async () => {
      renderWithProviders(<Community />);

      // Simulate disconnect
      mockWebSocket.emit('disconnected');

      await waitFor(() => {
        expect(screen.getByText(/attempting to reconnect/i)).toBeInTheDocument();
      });

      // Simulate successful reconnection
      mockWebSocket.emit('connected');

      await waitFor(() => {
        expect(screen.queryByText(/attempting to reconnect/i)).not.toBeInTheDocument();
      });
    });
  });
});