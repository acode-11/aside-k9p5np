import { styled } from '@mui/material/styles'; // v5.14+
import { Card, CardContent, Typography } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles } from '../../../styles/theme.styles';
import { TYPOGRAPHY, COLORS, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';

/**
 * Root container for analytics card with responsive layout and elevation
 */
export const AnalyticsCardRoot = styled(Card)`
  ${containerStyles.card};
  min-width: 300px;
  min-height: 180px;
  margin: ${SPACING.base * 2}px;
  transition: all 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.shadows[3]};
  }

  @media (max-width: ${BREAKPOINTS.tablet}px) {
    min-width: 100%;
    margin: ${SPACING.base}px 0;
  }
`;

/**
 * Card header with design system typography
 */
export const AnalyticsCardHeader = styled(Typography)`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.lg};
  font-weight: ${TYPOGRAPHY.fontWeight.semibold};
  color: ${COLORS.text.primary};
  margin-bottom: ${SPACING.base}px;
  padding: ${SPACING.base}px ${SPACING.base * 2}px;
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
`;

/**
 * Content container with flex layout and consistent spacing
 */
export const AnalyticsCardContent = styled(CardContent)`
  display: flex;
  flex-direction: column;
  padding: ${SPACING.base * 2}px;
  height: 100%;
  
  &:last-child {
    padding-bottom: ${SPACING.base * 2}px;
  }
`;

/**
 * Primary metric value with emphasized typography
 */
export const AnalyticsCardValue = styled(Typography)`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.xxl};
  font-weight: ${TYPOGRAPHY.fontWeight.bold};
  color: ${COLORS.text.primary};
  margin: ${SPACING.base}px 0;
  line-height: 1.2;
  
  @media (max-width: ${BREAKPOINTS.tablet}px) {
    font-size: ${TYPOGRAPHY.fontSize.xl};
  }
`;

/**
 * Trend indicator with dynamic color and animation
 */
export const AnalyticsCardTrend = styled('div')<{ trend: number }>`
  display: flex;
  align-items: center;
  gap: ${SPACING.base}px;
  color: ${({ trend }) => trend > 0 ? COLORS.success : COLORS.error};
  font-size: ${TYPOGRAPHY.fontSize.sm};
  font-weight: ${TYPOGRAPHY.fontWeight.medium};
  transition: color 0.2s ease-in-out;
  
  svg {
    transform: ${({ trend }) => trend > 0 ? 'rotate(0deg)' : 'rotate(180deg)'};
    transition: transform 0.2s ease-in-out;
  }
`;

/**
 * Secondary metric container with muted styling
 */
export const AnalyticsCardSecondary = styled(Typography)`
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.sm};
  color: ${COLORS.text.secondary};
  margin-top: auto;
  padding-top: ${SPACING.base}px;
  border-top: 1px solid ${({ theme }) => theme.palette.divider};
`;

/**
 * Loading state overlay with animation
 */
export const AnalyticsCardSkeleton = styled('div')`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.palette.background.paper} 25%,
    ${({ theme }) => theme.palette.action.hover} 50%,
    ${({ theme }) => theme.palette.background.paper} 75%
  );
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
  
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;