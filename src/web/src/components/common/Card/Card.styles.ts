import { styled } from '@mui/material/styles'; // v5.14+
import { Card, CardContent, CardActions } from '@mui/material'; // v5.14+
import { containerStyles } from '../../styles/theme.styles';

/**
 * Styled Card component with design system tokens and configurable elevation
 * Implements responsive layout and theme customization support
 */
export const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'elevation' && prop !== 'interactive'
})<{
  elevation?: number;
  interactive?: boolean;
}>`
  ${containerStyles.card};
  ${({ theme, elevation = 1 }) => theme.shadows[elevation]};
  
  ${({ interactive, theme }) =>
    interactive &&
    `
    cursor: pointer;
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: ${theme.shadows[3]};
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: ${theme.shadows[1]};
    }
    
    @media (prefers-reduced-motion: reduce) {
      transition: none;
      &:hover {
        transform: none;
      }
    }
  `}
`;

/**
 * Styled CardContent with responsive padding and spacing
 * Supports custom padding multipliers through props
 */
export const StyledCardContent = styled(CardContent, {
  shouldForwardProp: (prop) => prop !== 'padding'
})<{
  padding?: number;
}>`
  padding: ${({ theme, padding = 2 }) => theme.spacing(padding)};
  
  &:last-child {
    padding-bottom: ${({ theme, padding = 2 }) => theme.spacing(padding)};
  }
  
  ${({ theme }) => theme.breakpoints.up('sm')} {
    padding: ${({ theme, padding = 2 }) => theme.spacing(padding + 1)};
    
    &:last-child {
      padding-bottom: ${({ theme, padding = 2 }) => theme.spacing(padding + 1)};
    }
  }
`;

/**
 * Styled CardActions with configurable alignment and spacing
 * Supports flexible button/action layout patterns
 */
export const StyledCardActions = styled(CardActions, {
  shouldForwardProp: (prop) => prop !== 'alignment' && prop !== 'spacing'
})<{
  alignment?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  spacing?: number;
}>`
  display: flex;
  align-items: center;
  justify-content: ${({ alignment = 'flex-end' }) => alignment};
  padding: ${({ theme, spacing = 2 }) => theme.spacing(1, spacing)};
  gap: ${({ theme, spacing = 1 }) => theme.spacing(spacing)};
  
  ${({ theme }) => theme.breakpoints.up('sm')} {
    padding: ${({ theme, spacing = 2 }) => theme.spacing(2, spacing)};
  }
`;

/**
 * Higher-order component to add configurable elevation styles to card
 * Useful for dynamic elevation based on interaction state
 */
export const withElevation = <P extends object>(
  Component: React.ComponentType<P>,
  defaultElevation: number = 1
) => {
  return styled(Component)<P & { elevation?: number }>`
    ${({ theme, elevation = defaultElevation }) => `
      box-shadow: ${theme.shadows[elevation]};
      transition: box-shadow 0.2s ease-in-out;
      
      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `}
  `;
};

export default {
  StyledCard,
  StyledCardContent,
  StyledCardActions,
  withElevation
};