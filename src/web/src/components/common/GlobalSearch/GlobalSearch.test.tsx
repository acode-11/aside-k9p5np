/**
 * @fileoverview Test suite for GlobalSearch component verifying search functionality,
 * accessibility, and performance requirements.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React from 'react'; // v18.2.0
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react'; // v14.0.0
import userEvent from '@testing-library/user-event'; // v14.0.0
import { vi } from 'vitest'; // v0.34.0
import { BrowserRouter } from 'react-router-dom'; // v6.0+
import GlobalSearch from './GlobalSearch';
import { useSearch } from '../../../hooks/useSearch';
import { Detection } from '../../../types/detection.types';

// Mock the useSearch hook
vi.mock('../../../hooks/useSearch', () => ({
  useSearch: vi.fn()
}));

// Mock sample data
const mockDetections: Detection[] = [
  {
    id: 'test-id-1',
    name: 'Ransomware Detection',
    description: 'Detects ransomware activity',
    platformType: 'SIEM',
    metadata: {
      confidence: 95,
      platforms: ['SIEM'],
      tags: ['ransomware', 'encryption']
    }
  },
  {
    id: 'test-id-2',
    name: 'Lateral Movement',
    description: 'Detects lateral movement attempts',
    platformType: 'EDR',
    metadata: {
      confidence: 98,
      platforms: ['EDR'],
      tags: ['lateral-movement', 'privilege-escalation']
    }
  }
];

const mockSuggestions = [
  'ransomware detection',
  'lateral movement',
  'data exfiltration'
];

describe('GlobalSearch', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers();

    // Setup enhanced mock search hook
    (useSearch as jest.Mock).mockReturnValue({
      results: [],
      suggestions: [],
      isLoading: false,
      error: null,
      handleSearch: vi.fn(),
      handleFilterChange: vi.fn()
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render search input with correct placeholder', () => {
      render(
        <BrowserRouter>
          <GlobalSearch placeholder="Search detections..." />
        </BrowserRouter>
      );

      expect(screen.getByPlaceholderText('Search detections...')).toBeInTheDocument();
    });

    it('should render loading state correctly', async () => {
      (useSearch as jest.Mock).mockReturnValue({
        results: [],
        isLoading: true,
        handleSearch: vi.fn()
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render error state with notification', async () => {
      const errorMessage = 'Search failed';
      (useSearch as jest.Mock).mockReturnValue({
        results: [],
        error: new Error(errorMessage),
        handleSearch: vi.fn()
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should debounce search input', async () => {
      const handleSearch = vi.fn();
      (useSearch as jest.Mock).mockReturnValue({
        results: [],
        handleSearch
      });

      render(
        <BrowserRouter>
          <GlobalSearch debounceDelay={300} />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      await user.type(input, 'test');

      expect(handleSearch).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(handleSearch).toHaveBeenCalledWith('test');
    });

    it('should display search suggestions', async () => {
      (useSearch as jest.Mock).mockReturnValue({
        results: [],
        suggestions: mockSuggestions,
        handleSearch: vi.fn()
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      await user.type(input, 'ran');

      await waitFor(() => {
        mockSuggestions.forEach(suggestion => {
          expect(screen.getByText(suggestion)).toBeInTheDocument();
        });
      });
    });

    it('should handle result selection', async () => {
      const onResultSelect = vi.fn();
      (useSearch as jest.Mock).mockReturnValue({
        results: mockDetections,
        handleSearch: vi.fn()
      });

      render(
        <BrowserRouter>
          <GlobalSearch onResultSelect={onResultSelect} />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      await user.type(input, 'ransomware');

      const result = await screen.findByText('Ransomware Detection');
      await user.click(result);

      expect(onResultSelect).toHaveBeenCalledWith(mockDetections[0]);
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      const searchbox = screen.getByRole('searchbox');
      expect(searchbox).toHaveAttribute('aria-label', 'search detections');
      expect(searchbox).toHaveAttribute('aria-autocomplete', 'list');
    });

    it('should support keyboard navigation', async () => {
      (useSearch as jest.Mock).mockReturnValue({
        results: mockDetections,
        handleSearch: vi.fn()
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      await user.type(input, 'test');

      // Navigate through results with keyboard
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(screen.getByText('Ransomware Detection')).toHaveAttribute('aria-selected', 'true');

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      expect(screen.getByText('Lateral Movement')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Performance', () => {
    it('should meet search response time requirement', async () => {
      const startTime = performance.now();
      const handleSearch = vi.fn();

      (useSearch as jest.Mock).mockReturnValue({
        results: mockDetections,
        handleSearch
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      await user.type(input, 'test');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(2000); // 2s requirement
    });

    it('should handle rapid input changes efficiently', async () => {
      const handleSearch = vi.fn();
      (useSearch as jest.Mock).mockReturnValue({
        results: [],
        handleSearch
      });

      render(
        <BrowserRouter>
          <GlobalSearch />
        </BrowserRouter>
      );

      const input = screen.getByRole('searchbox');
      
      // Simulate rapid typing
      await user.type(input, 'test', { delay: 50 });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should only call search once due to debouncing
      expect(handleSearch).toHaveBeenCalledTimes(1);
    });
  });
});