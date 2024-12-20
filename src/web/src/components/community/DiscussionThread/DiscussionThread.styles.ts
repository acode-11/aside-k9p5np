import { styled } from '@mui/material/styles'; // v5.14+
import { Card } from '@mui/material'; // v5.14+
import { 
  COLORS, 
  SPACING as S, 
  ELEVATION 
} from '../../../constants/theme.constants';
import { 
  containerStyles, 
  surfaceStyles, 
  responsiveStyles 
} from '../../../styles/theme.styles';

/**
 * Main container for discussion thread with enhanced mobile responsiveness
 * Implements Material Design elevation system and touch optimization
 */
export const ThreadContainer = styled(Card)`
  ${containerStyles.card};
  ${surfaceStyles.primary};
  box-shadow: ${ELEVATION.levels.medium};
  margin-bottom: ${S.base * 2}px;
  transition: box-shadow 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    margin: ${S.base}px;
    border-radius: ${S.base}px;
  }

  ${responsiveStyles.touch} {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  &:hover {
    box-shadow: ${ELEVATION.levels.high};
  }

  &:focus-within {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
  }
`;

/**
 * Header section with optimized mobile padding and border styling
 * Includes semantic HTML structure and flexible layout
 */
export const ThreadHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${S.base * 2}px;
  border-bottom: 1px solid ${COLORS.text.secondary}20;
  min-height: 64px;

  ${responsiveStyles.mobile} {
    padding: ${S.base * 1.5}px;
    min-height: 56px;
  }

  /* Improved contrast for text elements */
  > * {
    color: ${COLORS.text.primary};
  }
`;

/**
 * Content section with responsive padding and improved content display
 * Implements minimum height and optimal reading width
 */
export const ThreadContent = styled.div`
  padding: ${S.base * 2}px;
  min-height: 120px;
  max-width: 100%;
  overflow-wrap: break-word;
  word-wrap: break-word;
  hyphens: auto;

  ${responsiveStyles.mobile} {
    padding: ${S.base * 1.5}px;
    min-height: 100px;
  }

  /* Preserve whitespace for code blocks */
  pre {
    white-space: pre-wrap;
    margin: ${S.base}px 0;
  }
`;

/**
 * Footer section with enhanced contrast and action spacing
 * Implements accessible hover states and touch targets
 */
export const ThreadFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${S.base * 1.5}px ${S.base * 2}px;
  background-color: ${COLORS.background.light}05;
  border-top: 1px solid ${COLORS.text.secondary}10;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;

  ${responsiveStyles.mobile} {
    padding: ${S.base}px ${S.base * 1.5}px;
    flex-wrap: wrap;
    gap: ${S.base}px;
  }

  /* High contrast mode support */
  @media (forced-colors: active) {
    border-top: 1px solid CanvasText;
  }
`;

/**
 * Container for thread actions with improved touch targets
 * Implements accessible spacing and interaction states
 */
export const ThreadActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${S.base * 1.5}px;

  ${responsiveStyles.mobile} {
    gap: ${S.base}px;
  }

  /* Enhanced touch targets for mobile */
  ${responsiveStyles.touch} {
    > * {
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  /* Focus visible styles for keyboard navigation */
  > *:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: 2px;
    border-radius: 4px;
  }
`;