/**
 * @fileoverview Enhanced React component for discussion threads with real-time updates,
 * accessibility features, and comprehensive error handling.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'; // v18.2+
import { 
  Avatar, 
  Typography, 
  IconButton, 
  Tooltip, 
  Skeleton, 
  Alert 
} from '@mui/material'; // v5.14+
import { 
  Reply as ReplyIcon, 
  ThumbUp as ThumbUpIcon, 
  Share as ShareIcon, 
  Error as ErrorIcon 
} from '@mui/icons-material'; // v5.14+

import { 
  ThreadContainer, 
  ThreadHeader, 
  ThreadContent, 
  ThreadFooter, 
  ThreadActions 
} from './DiscussionThread.styles';
import WebSocketService from '../../../services/websocket.service';
import { ApiError } from '../../../types/api.types';
import { IUser } from '../../../types/user.types';

// Enhanced interface for thread interaction states
interface InteractionState {
  liked: boolean;
  likeCount: number;
  replyCount: number;
  isUpdating: boolean;
}

// Props interface with comprehensive configuration options
interface DiscussionThreadProps {
  id: string;
  title: string;
  content: string;
  author: IUser;
  createdAt: Date;
  replyCount: number;
  likeCount: number;
  onReply: (threadId: string) => void;
  onLike: (threadId: string, liked: boolean) => void;
  onShare: (threadId: string) => void;
  isLoading?: boolean;
  wsConfig?: {
    url: string;
    reconnectAttempts: number;
  };
  onError?: (error: ApiError) => void;
}

/**
 * Custom hook for managing WebSocket connection with reconnection logic
 */
const useWebSocketConnection = (
  config?: DiscussionThreadProps['wsConfig'],
  onError?: (error: ApiError) => void
) => {
  const wsRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!config) return;

    wsRef.current = new WebSocketService({
      url: config.url,
      autoReconnect: true,
      reconnectAttempts: config.reconnectAttempts,
    });

    wsRef.current.on('connected', () => setIsConnected(true));
    wsRef.current.on('disconnected', () => setIsConnected(false));
    wsRef.current.on('error', (error: ApiError) => {
      onError?.(error);
    });

    wsRef.current.connect();

    return () => {
      wsRef.current?.disconnect();
    };
  }, [config, onError]);

  return { ws: wsRef.current, isConnected };
};

/**
 * Enhanced discussion thread component with real-time updates and accessibility
 */
const DiscussionThread: React.FC<DiscussionThreadProps> = ({
  id,
  title,
  content,
  author,
  createdAt,
  replyCount: initialReplyCount,
  likeCount: initialLikeCount,
  onReply,
  onLike,
  onShare,
  isLoading = false,
  wsConfig,
  onError
}) => {
  // State management with optimistic updates
  const [interactions, setInteractions] = useState<InteractionState>({
    liked: false,
    likeCount: initialLikeCount,
    replyCount: initialReplyCount,
    isUpdating: false
  });

  // WebSocket connection management
  const { ws, isConnected } = useWebSocketConnection(wsConfig, onError);

  // Memoized date formatting
  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(createdAt);
  }, [createdAt]);

  /**
   * Generic interaction handler with optimistic updates and error recovery
   */
  const handleInteraction = useCallback(async (
    type: 'like' | 'reply' | 'share',
    handler: () => Promise<void>
  ) => {
    if (interactions.isUpdating) return;

    setInteractions(prev => ({ ...prev, isUpdating: true }));
    const previousState = { ...interactions };

    try {
      // Optimistic update
      if (type === 'like') {
        setInteractions(prev => ({
          ...prev,
          liked: !prev.liked,
          likeCount: prev.liked ? prev.likeCount - 1 : prev.likeCount + 1
        }));
      }

      // Send update via WebSocket if connected
      if (ws && isConnected) {
        ws.send({
          type: `THREAD_${type.toUpperCase()}`,
          payload: { threadId: id, timestamp: Date.now() },
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          priority: 1,
          requiresAck: true
        });
      }

      await handler();
    } catch (error) {
      // Revert optimistic update on error
      setInteractions(previousState);
      onError?.(error as ApiError);
    } finally {
      setInteractions(prev => ({ ...prev, isUpdating: false }));
    }
  }, [id, interactions, ws, isConnected, onError]);

  // Event handlers with error boundaries
  const handleLikeClick = useCallback(() => {
    handleInteraction('like', () => onLike(id, !interactions.liked));
  }, [id, interactions.liked, handleInteraction, onLike]);

  const handleReplyClick = useCallback(() => {
    handleInteraction('reply', () => onReply(id));
  }, [id, handleInteraction, onReply]);

  const handleShareClick = useCallback(() => {
    handleInteraction('share', () => onShare(id));
  }, [id, handleInteraction, onShare]);

  // Loading state with skeleton UI
  if (isLoading) {
    return (
      <ThreadContainer>
        <ThreadHeader>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width="60%" />
        </ThreadHeader>
        <ThreadContent>
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
        </ThreadContent>
        <ThreadFooter>
          <Skeleton variant="text" width={120} />
        </ThreadFooter>
      </ThreadContainer>
    );
  }

  return (
    <ThreadContainer
      role="article"
      aria-labelledby={`thread-${id}-title`}
    >
      <ThreadHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            alt={`${author.firstName} ${author.lastName}`}
            src={`/api/v1/users/${author.id}/avatar`}
          />
          <div>
            <Typography
              id={`thread-${id}-title`}
              variant="h6"
              component="h2"
            >
              {title}
            </Typography>
            <Typography
              variant="caption"
              color="textSecondary"
              component="time"
              dateTime={createdAt.toISOString()}
            >
              {formattedDate}
            </Typography>
          </div>
        </div>
      </ThreadHeader>

      <ThreadContent>
        <Typography>{content}</Typography>
      </ThreadContent>

      <ThreadFooter>
        <Typography variant="body2" color="textSecondary">
          {interactions.replyCount} replies • {interactions.likeCount} likes
        </Typography>

        <ThreadActions>
          <Tooltip title="Reply to thread">
            <IconButton
              onClick={handleReplyClick}
              aria-label="Reply to thread"
              disabled={interactions.isUpdating}
            >
              <ReplyIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title={interactions.liked ? "Unlike" : "Like"}>
            <IconButton
              onClick={handleLikeClick}
              aria-label={interactions.liked ? "Unlike thread" : "Like thread"}
              color={interactions.liked ? "primary" : "default"}
              disabled={interactions.isUpdating}
            >
              <ThumbUpIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Share thread">
            <IconButton
              onClick={handleShareClick}
              aria-label="Share thread"
              disabled={interactions.isUpdating}
            >
              <ShareIcon />
            </IconButton>
          </Tooltip>
        </ThreadActions>
      </ThreadFooter>

      {!isConnected && (
        <Alert
          severity="warning"
          icon={<ErrorIcon />}
          sx={{ margin: 2 }}
        >
          Real-time updates are currently unavailable. Some features may be limited.
        </Alert>
      )}
    </ThreadContainer>
  );
};

export default DiscussionThread;