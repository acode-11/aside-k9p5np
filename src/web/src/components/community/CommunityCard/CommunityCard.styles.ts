import { styled } from '@mui/material/styles'; // v5.14+
import { Card, CardContent, CardHeader, CardActions } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles, COLORS, SPACING } from '../../../styles/theme.styles';

/**
 * Styled container component for community cards with elevation, hover effects,
 * and accessibility features. Implements responsive behaviors and reduced motion preferences.
 */
export const CommunityCardContainer = styled(Card)`
  ${containerStyles.card};
  width: 100%;
  cursor: pointer;
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  
  /* Hover state with elevation change */
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${surfaceStyles.elevation3};
  }
  
  /* Focus state for keyboard navigation */
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }
  
  /* Reduced motion preferences */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover {
      transform: none;
    }
  }

  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.scale[2]}px;
  }
`;

/**
 * Styled header component with responsive typography and proper spacing.
 * Implements design system typography scale and color tokens.
 */
export const CommunityCardHeader = styled(CardHeader)`
  padding: ${SPACING.scale[2]}px;

  .MuiCardHeader-title {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-weight: ${TYPOGRAPHY.fontWeight.semibold};
    font-size: ${TYPOGRAPHY.fontSize.lg};
    color: ${COLORS.text.primary};
    line-height: 1.3;
  }

  .MuiCardHeader-subheader {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.sm};
    color: ${COLORS.text.secondary};
    margin-top: ${SPACING.scale[0]}px;
  }

  ${responsiveStyles.mobile} {
    padding: ${SPACING.scale[1]}px;
    
    .MuiCardHeader-title {
      font-size: ${TYPOGRAPHY.fontSize.base};
    }
  }
`;

/**
 * Styled content component with flexible height and proper content spacing.
 * Implements consistent spacing scale and responsive adjustments.
 */
export const CommunityCardContent = styled(CardContent)`
  padding: ${SPACING.scale[2]}px;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  gap: ${SPACING.scale[1]}px;

  /* Typography styles for content text */
  p {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.base};
    color: ${COLORS.text.primary};
    margin: 0;
    line-height: 1.5;
  }

  ${responsiveStyles.mobile} {
    min-height: 100px;
    padding: ${SPACING.scale[1]}px;
  }
`;

/**
 * Styled footer component with metrics display and responsive layout.
 * Implements proper spacing and border styling from design system.
 */
export const CommunityCardFooter = styled(CardActions)`
  padding: ${SPACING.scale[2]}px;
  justify-content: space-between;
  border-top: 1px solid ${COLORS.divider || 'rgba(0, 0, 0, 0.12)'};
  flex-wrap: wrap;
  gap: ${SPACING.scale[1]}px;

  /* Typography styles for metrics and actions */
  .MuiButton-root {
    font-size: ${TYPOGRAPHY.fontSize.sm};
    text-transform: none;
  }

  .metric-label {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.sm};
    color: ${COLORS.text.secondary};
  }

  .metric-value {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-weight: ${TYPOGRAPHY.fontWeight.medium};
    color: ${COLORS.text.primary};
  }

  ${responsiveStyles.mobile} {
    padding: ${SPACING.scale[1]}px;
    flex-direction: column;
    align-items: flex-start;
  }

  ${responsiveStyles.tablet} {
    gap: ${SPACING.scale[2]}px;
  }
`;