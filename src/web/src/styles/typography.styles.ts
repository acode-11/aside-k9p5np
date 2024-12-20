import { css } from '@emotion/react'; // v11.11+
import { styled } from '@mui/material/styles'; // v5.14+
import { TYPOGRAPHY } from '../constants/theme.constants';

/**
 * Creates responsive heading typography styles with optimal metrics
 * @param size Base font size in pixels
 * @param weight Font weight value
 * @returns CSS styles for heading typography
 */
const createHeadingStyle = (size: number, weight: number) => css`
  font-family: ${TYPOGRAPHY.fontFamily.primary}, system-ui, -apple-system, sans-serif;
  font-size: clamp(${Math.round(size * 0.875)}px, ${size / 16}rem, ${size}px);
  font-weight: ${weight};
  line-height: ${size >= 24 ? 1.2 : 1.3};
  letter-spacing: ${size >= 24 ? '-0.02em' : '-0.01em'};
  margin: 0;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

/**
 * Creates body text typography styles with optimal reading metrics
 * @param size Base font size in pixels
 * @returns CSS styles for body typography
 */
const createBodyStyle = (size: number) => css`
  font-family: ${TYPOGRAPHY.fontFamily.primary}, system-ui, -apple-system, sans-serif;
  font-size: ${size}px;
  font-weight: ${TYPOGRAPHY.fontWeight.regular};
  line-height: 1.5;
  letter-spacing: normal;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

/**
 * Creates code typography styles with monospace font and adjusted metrics
 * @param size Base font size in pixels
 * @param isInline Whether the code is inline or block
 * @returns CSS styles for code typography
 */
const createCodeStyle = (size: number, isInline: boolean = false) => css`
  font-family: ${TYPOGRAPHY.fontFamily.secondary}, 'Roboto Mono', 'Courier New', monospace;
  font-size: ${isInline ? '0.9em' : `${size}px`};
  line-height: ${isInline ? 'inherit' : 1.4};
  font-weight: ${TYPOGRAPHY.fontWeight.regular};
  tab-size: 2;
  font-feature-settings: 'kern' 1, 'liga' 1, 'calt' 1;
  text-rendering: optimizeLegibility;
`;

/**
 * Heading typography styles with responsive scaling and optimal metrics
 */
export const headingStyles = {
  h1: css`
    ${createHeadingStyle(parseInt(TYPOGRAPHY.fontSize.xxl), TYPOGRAPHY.fontWeight.bold)}
  `,
  h2: css`
    ${createHeadingStyle(parseInt(TYPOGRAPHY.fontSize.xl), TYPOGRAPHY.fontWeight.semibold)}
  `,
  h3: css`
    ${createHeadingStyle(parseInt(TYPOGRAPHY.fontSize.lg), TYPOGRAPHY.fontWeight.semibold)}
  `,
} as const;

/**
 * Body text typography styles optimized for readability
 */
export const bodyStyles = {
  large: css`
    ${createBodyStyle(parseInt(TYPOGRAPHY.fontSize.lg))}
  `,
  medium: css`
    ${createBodyStyle(parseInt(TYPOGRAPHY.fontSize.base))}
  `,
  small: css`
    ${createBodyStyle(parseInt(TYPOGRAPHY.fontSize.sm))}
  `,
} as const;

/**
 * Code typography styles using monospace font with adjusted metrics
 */
export const codeStyles = {
  block: css`
    ${createCodeStyle(parseInt(TYPOGRAPHY.fontSize.sm))}
  `,
  inline: css`
    ${createCodeStyle(parseInt(TYPOGRAPHY.fontSize.sm), true)}
  `,
} as const;

/**
 * Styled components for common text elements with theme integration
 */
export const Text = {
  H1: styled('h1')`
    ${headingStyles.h1}
  `,
  H2: styled('h2')`
    ${headingStyles.h2}
  `,
  H3: styled('h3')`
    ${headingStyles.h3}
  `,
  Body: styled('p')`
    ${bodyStyles.medium}
  `,
  Small: styled('span')`
    ${bodyStyles.small}
  `,
  Code: styled('code')`
    ${codeStyles.inline}
  `,
  CodeBlock: styled('pre')`
    ${codeStyles.block}
  `,
} as const;

export default Text;