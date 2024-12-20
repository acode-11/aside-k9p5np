import { styled } from '@mui/material/styles'; // v5.14+
import { Box, Paper, Grid } from '@mui/material'; // v5.14+
import { 
  TYPOGRAPHY, 
  COLORS, 
  SPACING, 
  BREAKPOINTS 
} from '../../constants/theme.constants';
import { 
  containerStyles, 
  surfaceStyles, 
  responsiveStyles 
} from '../../styles/theme.styles';

/**
 * Main container for the settings page with responsive padding and max-width
 * Implements consistent spacing and breakpoint-based adjustments
 */
export const SettingsContainer = styled('div')`
  max-width: ${BREAKPOINTS.desktop}px;
  margin: 0 auto;
  padding: ${SPACING.scale[3]}px;
  
  ${responsiveStyles.mobile} {
    padding: ${SPACING.scale[2]}px;
  }

  ${responsiveStyles.tablet} {
    padding: ${SPACING.scale[2]}px ${SPACING.scale[3]}px;
  }

  ${responsiveStyles.print} {
    max-width: 100%;
    padding: 0;
  }
`;

/**
 * Container for individual settings sections with elevation and spacing
 * Implements card-style layout with consistent surface treatment
 */
export const SettingsSection = styled(Paper)`
  ${containerStyles.card};
  margin-bottom: ${SPACING.scale[3]}px;
  
  &:last-child {
    margin-bottom: 0;
  }

  ${responsiveStyles.mobile} {
    margin-bottom: ${SPACING.scale[2]}px;
  }

  &:hover {
    box-shadow: ${props => props.theme.shadows[2]};
    transition: box-shadow 0.2s ease-in-out;
  }
`;

/**
 * Grid layout for settings form elements with responsive spacing
 * Implements consistent gap and padding for form layout
 */
export const SettingsGrid = styled(Grid)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${SPACING.scale[2]}px;
  padding: ${SPACING.scale[2]}px;
  width: 100%;

  ${responsiveStyles.mobile} {
    grid-template-columns: 1fr;
    gap: ${SPACING.scale[1]}px;
    padding: ${SPACING.scale[1]}px;
  }

  ${responsiveStyles.tablet} {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
`;

/**
 * Header section for settings page with enhanced typography
 * Implements consistent text styling and spacing
 */
export const SettingsHeader = styled(Box)`
  margin-bottom: ${SPACING.scale[3]}px;
  
  h1 {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.xl};
    font-weight: ${TYPOGRAPHY.fontWeight.semibold};
    color: ${COLORS.text.primary};
    margin: 0 0 ${SPACING.scale[1]}px 0;
    line-height: 1.2;

    ${responsiveStyles.mobile} {
      font-size: ${TYPOGRAPHY.fontSize.lg};
    }
  }

  p {
    font-family: ${TYPOGRAPHY.fontFamily.primary};
    font-size: ${TYPOGRAPHY.fontSize.base};
    color: ${COLORS.text.secondary};
    margin: 0;
    line-height: 1.5;
  }
`;

/**
 * Form section container with enhanced spacing and borders
 * Implements consistent form group layout and separation
 */
export const SettingsFormSection = styled(Box)`
  padding: ${SPACING.scale[2]}px 0;
  border-bottom: 1px solid ${props => props.theme.palette.divider};

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  &:first-child {
    padding-top: 0;
  }

  ${responsiveStyles.mobile} {
    padding: ${SPACING.scale[1]}px 0;
  }
`;

/**
 * Action button container with responsive alignment
 * Implements consistent button layout and spacing
 */
export const SettingsActions = styled(Box)`
  display: flex;
  justify-content: flex-end;
  gap: ${SPACING.scale[2]}px;
  margin-top: ${SPACING.scale[3]}px;

  ${responsiveStyles.mobile} {
    flex-direction: column;
    gap: ${SPACING.scale[1]}px;
    margin-top: ${SPACING.scale[2]}px;
    
    button {
      width: 100%;
    }
  }
`;