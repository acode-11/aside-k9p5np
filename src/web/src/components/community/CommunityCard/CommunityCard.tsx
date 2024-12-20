import React, { memo, useCallback } from 'react';
import { Typography, Avatar, Chip, IconButton, Tooltip, Skeleton } from '@mui/material'; // v5.14+
import { PersonOutline, Star, ChatBubbleOutline, ErrorOutline } from '@mui/icons-material'; // v5.14+

import {
  CommunityCardContainer,
  CommunityCardHeader,
  CommunityCardContent,
  CommunityCardFooter,
  CommunityCardSkeleton
} from './CommunityCard.styles';
import { UserRole, PlatformType } from '../../../types/user.types';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { useNavigation } from '../../../hooks/useNavigation';

/**
 * Props interface for the CommunityCard component
 */
interface CommunityCardProps {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  detectionCount: number;
  discussionCount: number;
  isFavorite: boolean;
  type: PlatformType;
  userRole: UserRole;
  isLoading?: boolean;
  onFavoriteToggle: (id: string) => Promise<void>;
}

/**
 * CommunityCard component displays community information in a card format
 * with responsive layout and accessibility features.
 *
 * @param props - CommunityCardProps
 * @returns React.FC<CommunityCardProps>
 */
const CommunityCard: React.FC<CommunityCardProps> = ({
  id,
  name,
  description,
  memberCount,
  detectionCount,
  discussionCount,
  isFavorite,
  type,
  userRole,
  isLoading = false,
  onFavoriteToggle
}) => {
  const { trackEvent } = useAnalytics();
  const { navigateTo } = useNavigation();

  // Memoized event handlers for performance
  const handleClick = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    try {
      trackEvent('community_card_click', {
        community_id: id,
        community_type: type
      });
      
      await navigateTo(`/communities/${id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      // Error boundary will handle UI feedback
    }
  }, [id, type, trackEvent, navigateTo]);

  const handleFavorite = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      trackEvent('community_favorite_toggle', {
        community_id: id,
        is_favorite: !isFavorite
      });
      
      await onFavoriteToggle(id);
    } catch (error) {
      console.error('Favorite toggle error:', error);
      // Error boundary will handle UI feedback
    }
  }, [id, isFavorite, onFavoriteToggle, trackEvent]);

  // Show loading skeleton during data fetch
  if (isLoading) {
    return <CommunityCardSkeleton />;
  }

  return (
    <CommunityCardContainer
      onClick={handleClick}
      role="article"
      aria-label={`${name} community card`}
      tabIndex={0}
    >
      <CommunityCardHeader
        avatar={
          <Avatar aria-label={`${name} avatar`}>
            {name.charAt(0).toUpperCase()}
          </Avatar>
        }
        action={
          userRole !== UserRole.READER && (
            <Tooltip title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
              <IconButton
                onClick={handleFavorite}
                aria-label={isFavorite ? 'Unfavorite community' : 'Favorite community'}
                size="small"
              >
                <Star color={isFavorite ? 'primary' : 'action'} />
              </IconButton>
            </Tooltip>
          )
        }
        title={
          <Typography variant="h6" component="h2">
            {name}
            {userRole === UserRole.ADMIN && (
              <Chip
                size="small"
                label="Admin"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        }
        subheader={
          <Chip
            size="small"
            label={type}
            variant="outlined"
            sx={{ mt: 0.5 }}
          />
        }
      />

      <CommunityCardContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {description}
        </Typography>
      </CommunityCardContent>

      <CommunityCardFooter>
        <div style={{ display: 'flex', gap: '16px' }}>
          {memberCount > 0 && (
            <Tooltip title="Member count">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PersonOutline fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {memberCount.toLocaleString()}
                </Typography>
              </div>
            </Tooltip>
          )}

          {detectionCount > 0 && (
            <Tooltip title="Detection count">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ErrorOutline fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {detectionCount.toLocaleString()}
                </Typography>
              </div>
            </Tooltip>
          )}

          {discussionCount > 0 && (
            <Tooltip title="Discussion count">
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ChatBubbleOutline fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  {discussionCount.toLocaleString()}
                </Typography>
              </div>
            </Tooltip>
          )}
        </div>
      </CommunityCardFooter>
    </CommunityCardContainer>
  );
};

// Memoize component to prevent unnecessary re-renders
export default memo(CommunityCard);