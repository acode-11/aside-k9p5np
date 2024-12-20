import { styled } from '@mui/material/styles'; // v5.14+
import { Card, CardContent, CardActions } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../../styles/theme.styles';
import { TYPOGRAPHY, SPACING, BREAKPOINTS } from '../../../constants/theme.constants';

// View mode type for list/grid layout support
type ViewMode = 'list' | 'grid';

// Transition and interaction constants
const cardTransition = 'all 0.2s ease-in-out, box-shadow 0.15s ease-in-out';
const cardHoverElevation = 'var(--elevation-medium, 0 4px 8px rgba(0, 0, 0, 0.1))';
const cardFocusOutline = `2px solid var(--color-primary, #1976D2)`;

/**
 * Generates responsive styles based on view mode (list/grid)
 * @param viewMode Current view mode for layout
 * @returns CSS styles object for responsive layout
 */
const getViewModeStyles = (viewMode: ViewMode) => `
  ${viewMode === 'grid' ? `
    width: 100%;
    
    @media (min-width: ${BREAKPOINTS.tablet}px) {
      width: calc(50% - ${SPACING.base * 4}px);
    }
    
    @media (min-width: ${BREAKPOINTS.desktop}px) {
      width: calc(33.33% - ${SPACING.base * 4}px);
    }
  ` : `
    width: 100%;
    max-width: 100%;
    
    @media (min-width: ${BREAKPOINTS.tablet}px) {
      display: flex;
      align-items: center;
    }
  `}
`;

/**
 * Styled Card container with responsive layout and accessibility
 */
export const DetectionCardContainer = styled(Card, {
  shouldForwardProp: prop => !['viewMode'].includes(prop as string)
})<{ viewMode: ViewMode }>`
  ${containerStyles.card};
  ${({ viewMode }) => getViewModeStyles(viewMode)};
  
  margin: ${SPACING.base * 2}px;
  cursor: pointer;
  transition: ${cardTransition};
  position: relative;
  overflow: hidden;

  // Interactive states
  &:hover {
    box-shadow: ${cardHoverElevation};
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: ${cardFocusOutline};
    outline-offset: 2px;
  }

  // Accessibility and reduced motion
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    transform: none;
    
    &:hover, &:active {
      transform: none;
    }
  }

  ${responsiveStyles.mobile};
`;

/**
 * Styled card header with responsive typography
 */
export const DetectionCardHeader = styled(CardContent)`
  padding: ${SPACING.base * 2}px;
  display: flex;
  flex-direction: column;
  gap: ${SPACING.base}px;

  h3 {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.lg};
    font-weight: ${TYPOGRAPHY.fontWeight.semibold};
    margin: 0;
    color: var(--text-primary, rgba(0, 0, 0, 0.87));
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .metadata {
    font-size: ${TYPOGRAPHY.fontSize.sm};
    color: var(--text-secondary, rgba(0, 0, 0, 0.6));
    display: flex;
    gap: ${SPACING.base}px;
    flex-wrap: wrap;
  }
`;

/**
 * Styled card content with minimum height and typography
 */
export const DetectionCardContent = styled(CardContent)`
  padding: ${SPACING.base * 2}px;
  min-height: 100px;
  
  p {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.base};
    line-height: 1.5;
    margin: 0;
    color: var(--text-primary, rgba(0, 0, 0, 0.87));
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  .tags {
    margin-top: ${SPACING.base * 2}px;
    display: flex;
    gap: ${SPACING.base}px;
    flex-wrap: wrap;
  }
`;

/**
 * Styled card footer with action layout and spacing
 */
export const DetectionCardFooter = styled(CardActions)`
  padding: ${SPACING.base * 2}px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color, rgba(0, 0, 0, 0.12));
  
  // Touch-friendly spacing on mobile
  ${responsiveStyles.mobile} {
    gap: ${SPACING.base * 2}px;
    flex-wrap: wrap;
    justify-content: center;
    
    button {
      min-width: 120px;
    }
  }

  // Horizontal layout on larger screens
  @media (min-width: ${BREAKPOINTS.tablet}px) {
    flex-wrap: nowrap;
    justify-content: flex-end;
    gap: ${SPACING.base}px;
  }

  // RTL support
  [dir="rtl"] & {
    flex-direction: row-reverse;
  }
`;