import { styled } from '@mui/material/styles'; // @mui/material v5.14+
import { Paper, InputBase } from '@mui/material'; // @mui/material v5.14+
import { TYPOGRAPHY, COLORS, SPACING, BREAKPOINTS, ELEVATION } from '../../constants/theme.constants';

/**
 * Container component for the global search interface
 * Implements responsive behavior and elevation changes on focus
 */
export const SearchContainer = styled(Paper)`
  position: relative;
  width: 100%;
  max-width: 600px;
  border-radius: ${SPACING.base}px;
  box-shadow: ${ELEVATION.levels.low};
  transition: box-shadow 200ms ease-in-out;
  background-color: ${({ theme }) => theme.palette.background.paper};
  
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    max-width: 100%;
    margin: 0 ${SPACING.scale[2]}px;
  }
  
  &:focus-within {
    box-shadow: ${ELEVATION.levels.medium};
  }
`;

/**
 * Enhanced input component with accessibility features
 * Supports placeholder text, focus states, and mobile optimization
 */
export const SearchInput = styled(InputBase)`
  width: 100%;
  padding: ${SPACING.scale[2]}px;
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.base};
  color: ${({ theme }) => theme.palette.text.primary};
  transition: background-color 200ms ease;
  
  input {
    padding: ${SPACING.scale[1]}px ${SPACING.scale[2]}px;
    min-height: 48px;
    
    &::placeholder {
      color: ${({ theme }) => theme.palette.text.secondary};
      opacity: 0.8;
    }

    &:focus {
      outline: none;
    }
  }
  
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    font-size: ${TYPOGRAPHY.fontSize.sm};
  }
`;

/**
 * Results dropdown container with enhanced scrolling behavior
 * Implements custom scrollbar styling and mobile-optimized height
 */
export const SearchResults = styled(Paper)`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: ${SPACING.scale[1]}px;
  max-height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: ${SPACING.base}px;
  box-shadow: ${ELEVATION.levels.medium};
  z-index: 1000;
  background-color: ${({ theme }) => theme.palette.background.paper};
  scrollbar-width: thin;
  scrollbar-color: ${COLORS.primary} transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: ${COLORS.primary};
    border-radius: 3px;
  }
  
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    max-height: 60vh;
    margin-top: ${SPACING.scale[2]}px;
  }
`;

/**
 * Individual result item with keyboard navigation support
 * Implements hover and focus states for improved accessibility
 */
export const ResultItem = styled('div')`
  padding: ${SPACING.scale[2]}px ${SPACING.scale[3]}px;
  min-height: 48px;
  cursor: pointer;
  font-family: ${TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.sm};
  display: flex;
  align-items: center;
  transition: background-color 150ms ease;
  color: ${({ theme }) => theme.palette.text.primary};
  
  &:hover {
    background-color: ${({ theme }) => theme.palette.action.hover};
  }
  
  &.selected {
    background-color: ${({ theme }) => theme.palette.action.selected};
    outline: none;
  }
  
  &:focus-visible {
    outline: 2px solid ${COLORS.primary};
    outline-offset: -2px;
  }
  
  @media (max-width: ${BREAKPOINTS.mobile}px) {
    padding: ${SPACING.scale[2]}px;
    min-height: 56px; // Increased touch target size for mobile
  }
`;