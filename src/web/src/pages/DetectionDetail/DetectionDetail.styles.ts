import { styled } from '@mui/material/styles'; // v5.14+
import { Paper, Container, Grid } from '@mui/material'; // v5.14+
import { containerStyles, surfaceStyles, responsiveStyles } from '../../styles/theme.styles';

/**
 * Main container for the detection detail page with responsive padding
 * Implements spacing scale from design system specifications
 */
export const DetailContainer = styled(Container)(({ theme }) => `
  padding: ${theme.spacing(3)};
  max-width: 100%;
  height: 100%;
  overflow: hidden;

  ${responsiveStyles.mobile} {
    padding: ${theme.spacing(2)};
  }
`);

/**
 * Header section containing title and actions
 * Implements consistent spacing and responsive layout
 */
export const HeaderSection = styled('div')(({ theme }) => `
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing(3)};
  
  ${responsiveStyles.mobile} {
    flex-direction: column;
    align-items: flex-start;
    gap: ${theme.spacing(2)};
  }
`);

/**
 * Main content grid implementing the split-pane layout
 * Supports responsive breakpoints for optimal viewing
 */
export const ContentGrid = styled(Grid)(({ theme }) => `
  height: calc(100% - 120px); // Account for header and padding
  
  ${responsiveStyles.mobile} {
    height: auto;
  }
`);

/**
 * Editor section with proper elevation and sizing
 * Implements card container style with fixed height
 */
export const EditorSection = styled(Paper)`
  ${containerStyles.card};
  height: 600px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  ${responsiveStyles.mobile} {
    height: 400px;
    margin-bottom: ${({ theme }) => theme.spacing(2)};
  }
`;

/**
 * Toolbar container for editor actions and status
 * Implements consistent spacing and border styling
 */
export const ToolbarContainer = styled('div')(({ theme }) => `
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing(2)};
  border-bottom: 1px solid ${theme.palette.divider};
  min-height: 64px;
  
  ${responsiveStyles.mobile} {
    padding: ${theme.spacing(1)};
    flex-wrap: wrap;
    gap: ${theme.spacing(1)};
  }
`);

/**
 * Editor content container with flex growth
 * Ensures proper sizing and overflow handling
 */
export const EditorContent = styled('div')`
  flex: 1;
  overflow: hidden;
  position: relative;
`;

/**
 * Preview section with primary surface styling
 * Implements minimum height and proper spacing
 */
export const PreviewSection = styled(Paper)`
  ${containerStyles.card};
  ${surfaceStyles.primary};
  min-height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/**
 * Preview header with platform selector and actions
 * Implements consistent spacing and alignment
 */
export const PreviewHeader = styled('div')(({ theme }) => `
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing(2)};
  border-bottom: 1px solid ${theme.palette.divider};
`);

/**
 * Preview content container with scrolling support
 * Implements proper padding and overflow handling
 */
export const PreviewContent = styled('div')(({ theme }) => `
  flex: 1;
  padding: ${theme.spacing(2)};
  overflow: auto;
`);

/**
 * Validation panel with status indicators
 * Implements card styling with proper spacing
 */
export const ValidationPanel = styled(Paper)`
  ${containerStyles.card};
  margin-top: ${({ theme }) => theme.spacing(2)};
`;

/**
 * Status indicator container with flex layout
 * Implements consistent spacing and alignment
 */
export const StatusContainer = styled('div')(({ theme }) => `
  display: flex;
  align-items: center;
  gap: ${theme.spacing(1)};
`);

/**
 * Action buttons container with proper spacing
 * Implements responsive layout for button groups
 */
export const ActionContainer = styled('div')(({ theme }) => `
  display: flex;
  gap: ${theme.spacing(1)};
  
  ${responsiveStyles.mobile} {
    flex-wrap: wrap;
  }
`);