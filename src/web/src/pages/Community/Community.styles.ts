import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Grid, Paper } from '@mui/material'; // v5.14+
import { 
  containerStyles, 
  surfaceStyles, 
  responsiveStyles,
  createSpacing,
  createElevation
} from '../../styles/theme.styles';

/**
 * Main container for the Community page with responsive padding and theme integration
 * Implements full viewport height and background color from theme
 */
export const CommunityContainer = styled(Box)`
  width: 100%;
  min-height: 100vh;
  padding: ${createSpacing(3)};
  background-color: ${({ theme }) => theme.palette.background.default};
  transition: background-color 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    padding: ${createSpacing(2)};
  }

  ${responsiveStyles.print} {
    padding: 0;
    background-color: transparent;
  }
`;

/**
 * Grid layout for community content with responsive gap spacing
 * Implements Material-UI Grid with custom gap and transition
 */
export const CommunityGrid = styled(Grid)`
  width: 100%;
  display: grid;
  grid-template-columns: minmax(240px, 300px) 1fr;
  gap: ${createSpacing(3)};
  transition: gap 0.2s ease-in-out;

  ${responsiveStyles.tablet} {
    gap: ${createSpacing(2)};
  }

  ${responsiveStyles.mobile} {
    grid-template-columns: 1fr;
    gap: ${createSpacing(2)};
  }

  ${responsiveStyles.print} {
    display: block;
    gap: 0;
  }
`;

/**
 * Styled sidebar component with sticky positioning and elevation
 * Implements card container styles with primary surface treatment
 */
export const CommunitySidebar = styled(Paper)`
  ${containerStyles.card};
  ${surfaceStyles.primary};
  padding: ${createSpacing(2)};
  height: fit-content;
  position: sticky;
  top: ${createSpacing(2)};
  z-index: 1;
  transition: all 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    position: static;
    margin-bottom: ${createSpacing(2)};
  }

  ${responsiveStyles.tablet} {
    top: ${createSpacing(3)};
  }

  ${responsiveStyles.print} {
    display: none;
  }

  ${responsiveStyles.reducedMotion} {
    transition: none;
  }
`;

/**
 * Main content area component with flex growth and theme integration
 * Implements card container styles with primary surface treatment
 */
export const CommunityContent = styled(Paper)`
  ${containerStyles.card};
  ${surfaceStyles.primary};
  padding: ${createSpacing(3)};
  flex: 1;
  min-width: 0; // Prevents flex item overflow
  transition: all 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    padding: ${createSpacing(2)};
  }

  ${responsiveStyles.print} {
    box-shadow: none;
    padding: ${createSpacing(1)};
  }

  ${responsiveStyles.reducedMotion} {
    transition: none;
  }
`;

/**
 * Community section header with responsive typography
 * Implements heading styles with theme integration
 */
export const CommunityHeader = styled(Box)`
  margin-bottom: ${createSpacing(3)};
  padding-bottom: ${createSpacing(2)};
  border-bottom: 1px solid ${({ theme }) => theme.palette.divider};
  transition: border-color 0.2s ease-in-out;

  ${responsiveStyles.mobile} {
    margin-bottom: ${createSpacing(2)};
  }

  ${responsiveStyles.print} {
    border-bottom: none;
    margin-bottom: ${createSpacing(1)};
  }
`;

/**
 * Card container for community items with interactive states
 * Implements interactive card styles with elevation changes
 */
export const CommunityCard = styled(Paper)`
  ${containerStyles.cardInteractive};
  margin-bottom: ${createSpacing(2)};
  transition: all 0.2s ease-in-out;

  &:hover {
    box-shadow: ${createElevation('medium')};
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  ${responsiveStyles.mobile} {
    margin-bottom: ${createSpacing(1.5)};
  }

  ${responsiveStyles.print} {
    box-shadow: none;
    margin-bottom: ${createSpacing(1)};
    page-break-inside: avoid;
  }

  ${responsiveStyles.reducedMotion} {
    transform: none;
    transition: none;
    &:hover {
      transform: none;
    }
  }
`;