/**
 * @fileoverview Main Community Hub page component implementing real-time community features,
 * discussions, and member interactions following Material Design specifications.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Grid,
  Container,
  Typography,
  Button,
  Divider,
  Skeleton,
  Alert,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material'; // v5.14+
import {
  Add as AddIcon,
  Favorite,
  FavoriteBorder
} from '@mui/icons-material'; // v5.14+
import { ErrorBoundary } from 'react-error-boundary'; // v4.0+

import CommunityCard from '../../components/community/CommunityCard/CommunityCard';
import DiscussionThread from '../../components/community/DiscussionThread/DiscussionThread';
import { useWebSocket } from '../../hooks/useWebSocket';
import { COLORS, SPACING } from '../../constants/theme.constants';
import { UserRole } from '../../types/user.types';
import { ApiError } from '../../types/api.types';

// Enhanced interfaces for community data structures
interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  detectionCount: number;
  discussionCount: number;
  isFavorite: boolean;
  type: string;
  userRole: UserRole;
  lastActivity: Date;
  visibility: 'public' | 'private';
  tags: string[];
}

interface Discussion {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  lastUpdated: Date;
  replyCount: number;
  likeCount: number;
  isPinned: boolean;
  status: 'open' | 'closed' | 'archived';
}

// WebSocket configuration for real-time updates
const WS_CONFIG = {
  url: `${process.env.VITE_WS_URL}/community`,
  reconnectAttempts: 5,
  enableMessageBatching: true,
  securityConfig: {
    enableEncryption: true,
    validateOrigin: true,
    maxMessageSize: 1024 * 1024
  }
};

/**
 * Community Hub main page component implementing real-time features
 * and comprehensive error handling
 */
const Community: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // State management
  const [communities, setCommunities] = useState<Community[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // WebSocket connection for real-time updates
  const {
    status: wsStatus,
    isConnected,
    send,
    subscribe
  } = useWebSocket(WS_CONFIG.url, {
    autoConnect: true,
    reconnectOnError: true
  });

  /**
   * Fetch initial community data
   */
  const fetchCommunityData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [communitiesResponse, discussionsResponse] = await Promise.all([
        fetch('/api/v1/communities'),
        fetch('/api/v1/discussions')
      ]);

      if (!communitiesResponse.ok || !discussionsResponse.ok) {
        throw new Error('Failed to fetch community data');
      }

      const communitiesData = await communitiesResponse.json();
      const discussionsData = await discussionsResponse.json();

      setCommunities(communitiesData);
      setDiscussions(discussionsData);
    } catch (err) {
      setError(err as ApiError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle community creation with validation
   */
  const handleCreateCommunity = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    try {
      // Navigate to community creation page
      window.location.href = '/communities/new';
    } catch (err) {
      setError(err as ApiError);
    }
  }, []);

  /**
   * Handle favorite toggle with optimistic updates
   */
  const handleFavoriteToggle = useCallback(async (
    communityId: string,
    currentStatus: boolean
  ) => {
    try {
      // Optimistic update
      setCommunities(prev => prev.map(community => 
        community.id === communityId
          ? { ...community, isFavorite: !currentStatus }
          : community
      ));

      // Send update via WebSocket
      if (isConnected) {
        send({
          type: 'COMMUNITY_FAVORITE',
          payload: {
            communityId,
            isFavorite: !currentStatus
          }
        });
      }

      // API call
      const response = await fetch(`/api/v1/communities/${communityId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
    } catch (err) {
      // Revert optimistic update
      setCommunities(prev => prev.map(community =>
        community.id === communityId
          ? { ...community, isFavorite: currentStatus }
          : community
      ));
      setError(err as ApiError);
    }
  }, [isConnected, send]);

  /**
   * Subscribe to WebSocket events for real-time updates
   */
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribeCommunity = subscribe('COMMUNITY_UPDATE', (message) => {
      setCommunities(prev => prev.map(community =>
        community.id === message.data.id
          ? { ...community, ...message.data }
          : community
      ));
    });

    const unsubscribeDiscussion = subscribe('DISCUSSION_UPDATE', (message) => {
      setDiscussions(prev => prev.map(discussion =>
        discussion.id === message.data.id
          ? { ...discussion, ...message.data }
          : discussion
      ));
    });

    return () => {
      unsubscribeCommunity();
      unsubscribeDiscussion();
    };
  }, [isConnected, subscribe]);

  // Initial data fetch
  useEffect(() => {
    fetchCommunityData();
  }, [fetchCommunityData]);

  // Memoized sorted discussions
  const sortedDiscussions = useMemo(() => {
    return [...discussions].sort((a, b) => 
      b.lastUpdated.getTime() - a.lastUpdated.getTime()
    );
  }, [discussions]);

  return (
    <ErrorBoundary
      fallback={
        <Alert severity="error" sx={{ m: 2 }}>
          An error occurred while loading the Community Hub.
          Please try refreshing the page.
        </Alert>
      }
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Community Hub
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateCommunity}
            sx={{ mb: 2 }}
          >
            Create Community
          </Button>
        </Box>

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Communities Section */}
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Communities
            </Typography>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={200}
                  sx={{ mb: 2 }}
                />
              ))
            ) : (
              communities.map(community => (
                <CommunityCard
                  key={community.id}
                  {...community}
                  onFavoriteToggle={() => handleFavoriteToggle(
                    community.id,
                    community.isFavorite
                  )}
                />
              ))
            )}
          </Grid>

          {/* Discussions Section */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Active Discussions
            </Typography>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={150}
                  sx={{ mb: 2 }}
                />
              ))
            ) : (
              sortedDiscussions.map(discussion => (
                <DiscussionThread
                  key={discussion.id}
                  {...discussion}
                  onReply={() => {}}
                  onLike={() => {}}
                  onShare={() => {}}
                />
              ))
            )}
          </Grid>
        </Grid>

        {/* Connection Status */}
        {!isConnected && (
          <Alert
            severity="warning"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            Connection lost. Attempting to reconnect...
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert
            severity="error"
            onClose={() => setError(null)}
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
          >
            {error.message}
          </Alert>
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default Community;