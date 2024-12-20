import type { JestConfigWithTsJest } from 'ts-jest';

/**
 * Jest configuration for React frontend application
 * Configures test environment, TypeScript support, module resolution, coverage reporting,
 * and component testing setup
 * 
 * @version jest: ^29.0.0
 * @version ts-jest: ^29.0.0
 * @version @testing-library/jest-dom: ^5.16.5
 */
const config: JestConfigWithTsJest = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Configure jsdom test environment for React component testing
  testEnvironment: 'jsdom',

  // Setup files to run after jest is initialized
  setupFilesAfterEnv: [
    '@testing-library/jest-dom'
  ],

  // Module name mapping for path aliases and asset mocking
  moduleNameMapper: {
    // Map TypeScript path aliases from tsconfig
    '^@/(.*)$': '<rootDir>/src/$1',
    
    // Mock CSS modules
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    
    // Mock static assets
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.ts'
  },

  // TypeScript transformation configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.json'
    }]
  },

  // Test file patterns
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.[jt]sx?$',

  // File extensions to consider
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/index.{ts,tsx}',
    '!src/vite-env.d.ts'
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Paths to ignore during testing
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],

  // Watch mode plugins for better development experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],

  // Clear mocks between each test
  clearMocks: true,

  // Verbose output for better debugging
  verbose: true,

  // Maximum number of concurrent workers
  maxWorkers: '50%',

  // Detect open handles for async operations
  detectOpenHandles: true,

  // Error handling
  bail: 1,
  errorOnDeprecated: true,

  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest'
};

export default config;