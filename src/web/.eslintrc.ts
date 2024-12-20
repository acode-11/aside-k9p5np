// ESLint configuration for AI-Powered Detection Platform web frontend
// Version requirements:
// @typescript-eslint/parser: ^6.0.0
// @typescript-eslint/eslint-plugin: ^6.0.0
// eslint-plugin-react: ^7.33.0
// eslint-plugin-react-hooks: ^4.6.0
// eslint-config-prettier: ^9.0.0
// eslint-plugin-security: ^1.7.1

module.exports = {
  // Parser configuration for TypeScript
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
    tsconfigRootDir: '.',
    createDefaultProgram: true,
  },

  // Environment configuration
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
  },

  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:security/recommended',
    'prettier', // Must be last to override other formatting rules
  ],

  // Required plugins
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'security',
  ],

  // Custom rule configurations
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',

    // React specific rules
    'react/react-in-jsx-scope': 'off', // Not needed in React 18+
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-key': ['error', {
      checkFragmentShorthand: true,
    }],

    // General JavaScript rules
    'no-console': ['warn', {
      allow: ['warn', 'error']
    }],
    'no-debugger': 'error',
    'no-unused-vars': 'off', // Using TypeScript version instead

    // Security rules
    'security/detect-object-injection': 'warn',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
  },

  // React version detection
  settings: {
    react: {
      version: 'detect',
    },
  },

  // Files to ignore
  ignorePatterns: [
    'dist',
    'node_modules',
    'vite.config.ts',
    'jest.config.ts',
    'coverage',
    'build',
    '*.d.ts',
  ],

  // Rule overrides for specific file patterns
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off', // Allow any in test files
        'security/detect-object-injection': 'off', // Allow object injection in tests
      },
    },
  ],
};