import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import DetectionLibrary from './DetectionLibrary';
import { useDetection } from '../../hooks/useDetection';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock detection data
const mockDetections = [
  {
    id: '1',
    name: 'Ransomware Detection v2.1',
    description: 'Advanced ransomware detection rule',
    platformType: 'SIEM',
    version: '2.1.0',
    metadata: {
      severity: 'HIGH',
      confidence: 95,
      platforms: ['SIEM', 'EDR'],
      lastValidated: '2023-12-01T00:00:00Z',
      tags: ['ransomware', 'encryption']
    },
    qualityScore: 98,
    createdAt: '2023-11-01T00:00:00Z',
    updatedAt: '2023-12-01T00:00:00Z'
  },
  // Add more mock detections as needed
];

// Mock filters
const mockFilters = {
  platforms: ['SIEM', 'EDR', 'NSM'],
  tags: ['ransomware', 'lateral-movement', 'data-exfiltration'],
  sortOptions: ['updatedAt', 'name', 'qualityScore']
};

// Constants
const TEST_TIMEOUT = 5000;

// Mock useDetection hook
jest.mock('../../hooks/useDetection', () => ({
  useDetection: jest.fn()
}));

// Helper function to render component with providers
const renderWithProviders = (ui: React.ReactElement, options = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0
      }
    }
  });

  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={queryClient}>
        <Provider store={options.store || createTestStore()}>
          <MemoryRouter>
            {ui}
          </MemoryRouter>
        </Provider>
      </QueryClientProvider>
    )
  };
};

// Helper function to setup mocks
const setupMocks = (options = {}) => {
  const mockUseDetection = {
    detections: mockDetections,
    loading: { detections: false },
    error: null,
    fetchDetections: jest.fn(),
    validateDetection: jest.fn(),
    ...options
  };

  (useDetection as jest.Mock).mockReturnValue(mockUseDetection);
  return mockUseDetection;
};

describe('DetectionLibrary', () => {
  beforeEach(() => {
    setupMocks();
  });

  describe('Rendering', () => {
    it('renders loading state correctly', () => {
      setupMocks({ loading: { detections: true } });
      renderWithProviders(<DetectionLibrary />);
      
      expect(screen.getByTestId('detection-library-loading')).toBeInTheDocument();
      expect(screen.getAllByRole('progressbar')).toHaveLength(3); // 3 loading skeletons
    });

    it('renders empty state when no detections', () => {
      setupMocks({ detections: [] });
      renderWithProviders(<DetectionLibrary />);
      
      expect(screen.getByText(/No detections found/i)).toBeInTheDocument();
    });

    it('renders error state correctly', () => {
      setupMocks({ error: { message: 'Failed to load detections' } });
      renderWithProviders(<DetectionLibrary />);
      
      expect(screen.getByText(/Failed to load detections/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('renders detection list successfully', () => {
      renderWithProviders(<DetectionLibrary />);
      
      expect(screen.getByTestId('detection-library-list')).toBeInTheDocument();
      expect(screen.getAllByRole('article')).toHaveLength(mockDetections.length);
    });
  });

  describe('Search Functionality', () => {
    it('performs search with debouncing', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      const searchInput = screen.getByPlaceholderText(/search detections/i);
      
      await user.type(searchInput, 'ransomware');
      
      await waitFor(() => {
        expect(screen.getByText(/Ransomware Detection v2.1/i)).toBeInTheDocument();
      }, { timeout: TEST_TIMEOUT });
    });

    it('shows search results with highlighting', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      const searchInput = screen.getByPlaceholderText(/search detections/i);
      
      await user.type(searchInput, 'ransomware');
      
      await waitFor(() => {
        const highlightedText = screen.getByText(/ransomware/i);
        expect(highlightedText).toHaveClass('highlighted');
      });
    });

    it('meets search performance requirements', async () => {
      const startTime = performance.now();
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.type(screen.getByPlaceholderText(/search detections/i), 'ransomware');
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2 second requirement
    });
  });

  describe('Filtering', () => {
    it('filters by platform type', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      const platformFilter = screen.getByLabelText(/filter by platform/i);
      
      await user.click(platformFilter);
      await user.click(screen.getByText('SIEM'));
      
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('combines multiple filters', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      // Select platform
      await user.click(screen.getByLabelText(/filter by platform/i));
      await user.click(screen.getByText('SIEM'));
      
      // Add tag filter
      await user.click(screen.getByLabelText(/filter by tag/i));
      await user.click(screen.getByText('ransomware'));
      
      expect(screen.getAllByRole('article')).toHaveLength(1);
    });

    it('resets filters correctly', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.click(screen.getByText(/clear filters/i));
      
      expect(screen.getAllByRole('article')).toHaveLength(mockDetections.length);
    });
  });

  describe('Sorting', () => {
    it('sorts by update date', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.click(screen.getByLabelText(/sort by/i));
      await user.click(screen.getByText(/last updated/i));
      
      const detections = screen.getAllByRole('article');
      expect(detections[0]).toHaveTextContent('Ransomware Detection v2.1');
    });

    it('toggles sort direction', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.click(screen.getByLabelText(/sort direction/i));
      
      const detections = screen.getAllByRole('article');
      expect(detections[detections.length - 1]).toHaveTextContent('Ransomware Detection v2.1');
    });
  });

  describe('Pagination', () => {
    it('navigates between pages', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.click(screen.getByLabelText(/next page/i));
      expect(screen.getByLabelText(/page 2/i)).toHaveAttribute('aria-current', 'true');
    });

    it('updates items per page', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.click(screen.getByLabelText(/rows per page/i));
      await user.click(screen.getByText('50'));
      
      expect(screen.getAllByRole('article')).toHaveLength(mockDetections.length);
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderWithProviders(<DetectionLibrary />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const { user } = renderWithProviders(<DetectionLibrary />);
      
      await user.tab();
      expect(screen.getByPlaceholderText(/search detections/i)).toHaveFocus();
      
      await user.tab();
      expect(screen.getByLabelText(/filter by platform/i)).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('renders within performance budget', async () => {
      const startTime = performance.now();
      renderWithProviders(<DetectionLibrary />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(200); // 200ms render budget
    });

    it('handles large detection lists efficiently', async () => {
      const largeDetectionList = Array(1000).fill(null).map((_, index) => ({
        ...mockDetections[0],
        id: `detection-${index}`
      }));
      
      setupMocks({ detections: largeDetectionList });
      
      const startTime = performance.now();
      renderWithProviders(<DetectionLibrary />);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 1 second render budget for large lists
    });
  });
});