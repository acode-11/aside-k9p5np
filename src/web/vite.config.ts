// Vite configuration for AI-Powered Detection Platform frontend
// Dependencies versions:
// vite: ^4.0.0
// @vitejs/plugin-react: ^4.0.0
// vite-tsconfig-paths: ^4.2.0
// path: ^18.0.0

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  // React plugin configuration with Fast Refresh and optimized JSX runtime
  plugins: [
    react({
      // Enable Fast Refresh for development
      fastRefresh: true,
      // Use new JSX transform
      jsxRuntime: 'automatic',
      // Enable babel plugins for advanced features
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          '@babel/plugin-proposal-class-properties'
        ]
      }
    }),
    // Enable TypeScript path aliases support
    tsconfigPaths()
  ],

  // Module resolution configuration
  resolve: {
    alias: {
      // Set up root alias for absolute imports
      '@': path.resolve(__dirname, './src')
    },
    // Enable .mjs and .mts files
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },

  // Development server configuration
  server: {
    port: 3000,
    host: true,
    // Enable HMR with overlay
    hmr: {
      overlay: true
    },
    // API proxy configuration for development
    proxy: {
      // REST API proxy
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      // WebSocket proxy for real-time features
      '/ws': {
        target: 'ws://localhost:8001',
        ws: true
      }
    }
  },

  // Production build configuration
  build: {
    outDir: 'dist',
    // Enable source maps for debugging
    sourcemap: true,
    // Target modern browsers
    target: 'esnext',
    // Use esbuild for faster builds
    minify: 'esbuild',
    // Chunk splitting configuration
    rollupOptions: {
      output: {
        // Separate vendor chunks for better caching
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-state': ['@reduxjs/toolkit', 'react-query'],
          'vendor-editor': ['@monaco-editor/react'],
          'vendor-utils': ['date-fns', 'lodash']
        }
      }
    },
    // CSS optimization
    cssCodeSplit: true,
    // Asset handling
    assetsDir: 'assets',
    // Enable asset inlining threshold
    assetsInlineLimit: 4096
  },

  // Test environment configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/setupTests.ts']
    }
  },

  // CSS modules configuration
  css: {
    modules: {
      // Use camelCase for CSS modules
      localsConvention: 'camelCase',
      // Generate scoped class names
      generateScopedName: '[name]__[local]___[hash:base64:5]'
    },
    // PostCSS configuration
    postcss: {
      plugins: [
        'autoprefixer',
        'postcss-flexbugs-fixes'
      ]
    }
  },

  // Environment configuration
  envDir: './',
  // Enable detailed build info
  clearScreen: false,
  // Logger configuration
  logLevel: 'info',

  // Performance optimizations
  optimizeDeps: {
    // Include heavy dependencies for optimization
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      '@monaco-editor/react'
    ]
  },

  // Security headers
  headers: {
    '/*': {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  }
});