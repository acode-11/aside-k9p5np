import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

import Dashboard from './Dashboard';
import { useDetection } from '../../hooks/useDetection';
import { useAuth } from '../../hooks/useAuth';
import { Detection, DetectionSeverity } from '../../types/detection.types';
import { PlatformType } from '../../types/platform.types';

// Mock hooks
vi.mock('../../hooks/useDetection');
vi.mock('../../hooks/useAuth');

// Mock data
const mockDetections: Detection[] = [
  {
    id: '1',
    name: 'Ransomware Detection v2.1',
    description: 'Advanced ransomware detection rule',
    content: 'rule content',
    platformType: PlatformType.SIEM,
    version: '2.1.0',
    owner: {
      id: 'user1',
      email: 'user@example.com'
    },
    metadata: {
      mitreTactics: ['T1486'],
      mitreTechniques: ['T1486'],
      severity: DetectionSeverity.HIGH,
      confidence: 95,
      falsePositiveRate: 2,
      mitreVersion: '10.0',
      dataTypes: ['process_creation'],
      platforms: [PlatformType.SIEM],
      tags: ['ransomware'],
      lastValidated: new Date()
    },
    qualityScore: 98,
    tags: ['ransomware', 'encryption'],
    createdAt: new Date(),
    updatedAt: new Date(),
    platformConfig: {}
  }
];

const mockAnalytics = {
  activeUsers: 1234,
  totalDetections: 10000,
  deploymentRate: 85,
  accuracy: 98
};

// Test setup helper
const setupTest = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  });

  // Mock useDetection hook
  (useDetection as jest.Mock).mockReturnValue({
    detections: mockDetections,
    fetchDetections: vi.fn(),
    isLoading: false,
    error: null
  });

  // Mock useAuth hook
  (useAuth as jest.Mock).mockReturnValue({
    user: {
      id: 'user1',
      email: 'user@example.com'
    },
    isAuthenticated: true
  });

  const renderDashboard = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  return { renderDashboard };
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders dashboard layout correctly', async () => {
    const { renderDashboard } = setupTest();
    renderDashboard();

    // Verify header
    expect(screen.getByText('AI Detection Platform')).toBeInTheDocument();
    expect(screen.getByText('Discover, share, and generate detection content')).toBeInTheDocument();

    // Verify analytics cards
    expect(screen.getByTestId('analytics-active-users')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-total-detections')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-deployment-rate')).toBeInTheDocument();
    expect(screen.getByTestId('analytics-accuracy')).toBeInTheDocument();

    // Verify sections
    expect(screen.getByText('Featured Detections')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
  });

  it('displays analytics metrics correctly', async () => {
    const { renderDashboard } = setupTest();
    renderDashboard();

    // Verify metric values
    expect(screen.getByText('1,234')).toBeInTheDocument(); // Active Users
    expect(screen.getByText('10,000')).toBeInTheDocument(); // Total Detections
    expect(screen.getByText('85%')).toBeInTheDocument(); // Deployment Rate
    expect(screen.getByText('98%')).toBeInTheDocument(); // Accuracy

    // Verify metric trends
    const activeUsersCard = screen.getByTestId('analytics-active-users');
    expect(within(activeUsersCard).getByText('+5.2%')).toBeInTheDocument();
  });

  it('handles loading states properly', async () => {
    // Mock loading state
    (useDetection as jest.Mock).mockReturnValue({
      detections: [],
      fetchDetections: vi.fn(),
      isLoading: true,
      error: null
    });

    const { renderDashboard } = setupTest();
    renderDashboard();

    // Verify loading skeletons
    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('handles error states correctly', async () => {
    // Mock error state
    (useDetection as jest.Mock).mockReturnValue({
      detections: [],
      fetchDetections: vi.fn(),
      isLoading: false,
      error: new Error('Failed to load dashboard data')
    });

    const { renderDashboard } = setupTest();
    renderDashboard();

    // Verify error message
    expect(screen.getByText('Failed to load dashboard data. Please try again later.')).toBeInTheDocument();
  });

  it('navigates to detection details on card click', async () => {
    const { renderDashboard } = setupTest();
    renderDashboard();

    // Find and click detection card
    const detectionCard = screen.getByTestId('featured-detection-1');
    fireEvent.click(detectionCard);

    // Verify navigation
    expect(window.location.pathname).toBe('/detections/1');
  });

  it('maintains accessibility standards', () => {
    const { renderDashboard } = setupTest();
    const { container } = renderDashboard();

    // Check for ARIA labels
    expect(screen.getByRole('heading', { name: 'AI Detection Platform' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Featured Detections' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Recent Activity' })).toBeInTheDocument();

    // Verify keyboard navigation
    const cards = screen.getAllByRole('article');
    cards[0].focus();
    expect(document.activeElement).toBe(cards[0]);

    // Check for color contrast
    // Note: This would require additional tooling like jest-axe for comprehensive checks
  });

  it('fetches dashboard data on mount', () => {
    const mockFetchDetections = vi.fn();
    (useDetection as jest.Mock).mockReturnValue({
      detections: mockDetections,
      fetchDetections: mockFetchDetections,
      isLoading: false,
      error: null
    });

    const { renderDashboard } = setupTest();
    renderDashboard();

    expect(mockFetchDetections).toHaveBeenCalledTimes(1);
  });
});