import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from '@axe-core/react'; // v4.7.3
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DetectionList } from './DetectionList';
import { Detection, DetectionSeverity } from '../../../types/detection.types';
import { PlatformType } from '../../../types/platform.types';

// Mock intersection observer
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockImplementation((callback) => {
  return {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn()
  };
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock detection data generator
const generateMockDetection = (overrides: Partial<Detection> = {}): Detection => ({
  id: `detection-${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Detection',
  description: 'Test detection description',
  content: 'detection content',
  platformType: PlatformType.SIEM,
  version: '1.0.0',
  owner: {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'CONTRIBUTOR',
    organizationId: 'org-1',
    teamIds: ['team-1'],
    platformPermissions: {},
    preferences: {
      theme: 'LIGHT',
      notifications: 'ALL',
      defaultPlatform: PlatformType.SIEM
    },
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  metadata: {
    mitreTactics: ['discovery'],
    mitreTechniques: ['T1046'],
    severity: DetectionSeverity.HIGH,
    confidence: 90,
    falsePositiveRate: 5,
    mitreVersion: '10.0',
    dataTypes: ['network'],
    platforms: [PlatformType.SIEM],
    tags: ['network', 'scanning'],
    lastValidated: new Date()
  },
  qualityScore: 95,
  tags: ['network', 'scanning'],
  createdAt: new Date(),
  updatedAt: new Date(),
  platformConfig: {},
  ...overrides
});

// Mock handlers
const mockHandlers = {
  onFilterChange: vi.fn(),
  onSortChange: vi.fn(),
  onSelectionChange: vi.fn()
};

// Custom render function with required providers
const renderDetectionList = (props = {}) => {
  return render(
    <DetectionList
      viewMode="grid"
      filters={{}}
      sortBy="createdAt"
      sortOrder="desc"
      onFilterChange={mockHandlers.onFilterChange}
      onSortChange={mockHandlers.onSortChange}
      onSelectionChange={mockHandlers.onSelectionChange}
      enableBulkOperations={true}
      virtualizeList={true}
      pageSize={20}
      testId="detection-list"
      {...props}
    />
  );
};

describe('DetectionList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      renderDetectionList();
      expect(screen.getByTestId('detection-list')).toBeInTheDocument();
    });

    it('displays loading skeleton when loading', () => {
      renderDetectionList();
      const skeletons = screen.getAllByTestId(/detection-list-loading-/);
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('displays error message when error occurs', async () => {
      const errorMessage = 'Failed to load detections';
      renderDetectionList({ error: { message: errorMessage } });
      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
    });

    it('renders detection cards with correct data', async () => {
      const mockDetections = [
        generateMockDetection(),
        generateMockDetection()
      ];
      renderDetectionList({ detections: mockDetections });
      
      await waitFor(() => {
        mockDetections.forEach(detection => {
          expect(screen.getByText(detection.name)).toBeInTheDocument();
          expect(screen.getByText(detection.description)).toBeInTheDocument();
        });
      });
    });
  });

  describe('View Mode Switching', () => {
    it('switches between grid and list views', async () => {
      renderDetectionList();
      
      const gridButton = screen.getByRole('button', { name: /grid view/i });
      const listButton = screen.getByRole('button', { name: /list view/i });
      
      await userEvent.click(listButton);
      expect(mockHandlers.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ viewMode: 'list' })
      );
      
      await userEvent.click(gridButton);
      expect(mockHandlers.onFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ viewMode: 'grid' })
      );
    });

    it('applies correct layout classes based on view mode', () => {
      const { rerender } = renderDetectionList({ viewMode: 'grid' });
      expect(screen.getByTestId('detection-list-container')).toHaveStyle({
        display: 'grid'
      });

      rerender(<DetectionList viewMode="list" />);
      expect(screen.getByTestId('detection-list-container')).toHaveStyle({
        display: 'flex',
        flexDirection: 'column'
      });
    });
  });

  describe('Interactions', () => {
    it('handles selection of multiple items', async () => {
      const mockDetections = [
        generateMockDetection(),
        generateMockDetection()
      ];
      renderDetectionList({ detections: mockDetections });

      const cards = await screen.findAllByTestId(/detection-list-card-/);
      await userEvent.click(cards[0]);
      await userEvent.click(cards[1]);

      expect(mockHandlers.onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining([mockDetections[0].id, mockDetections[1].id])
      );
    });

    it('handles bulk operations on selected items', async () => {
      const mockDetections = [generateMockDetection()];
      renderDetectionList({ 
        detections: mockDetections,
        enableBulkOperations: true 
      });

      const card = await screen.findByTestId(`detection-list-card-${mockDetections[0].id}`);
      await userEvent.click(card);

      const bulkOperationsBar = screen.getByText(/1 items selected/i);
      expect(bulkOperationsBar).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 accessibility guidelines', async () => {
      const { container } = renderDetectionList();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', async () => {
      const mockDetections = [
        generateMockDetection(),
        generateMockDetection()
      ];
      renderDetectionList({ detections: mockDetections });

      const firstCard = await screen.findByTestId(`detection-list-card-${mockDetections[0].id}`);
      firstCard.focus();
      expect(document.activeElement).toBe(firstCard);

      fireEvent.keyDown(firstCard, { key: 'Enter' });
      expect(mockHandlers.onSelectionChange).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('virtualizes list for large datasets', async () => {
      const mockDetections = Array(100).fill(null).map(() => generateMockDetection());
      renderDetectionList({ 
        detections: mockDetections,
        virtualizeList: true 
      });

      const container = screen.getByTestId('detection-list-container');
      expect(container.children.length).toBeLessThan(mockDetections.length);
    });

    it('handles infinite scroll loading', async () => {
      const mockDetections = Array(50).fill(null).map(() => generateMockDetection());
      renderDetectionList({ detections: mockDetections });

      const loadMoreTrigger = screen.getByTestId('detection-list-load-more');
      const mockIntersectionCallback = mockIntersectionObserver.mock.calls[0][0];
      
      mockIntersectionCallback([{ isIntersecting: true }]);
      await waitFor(() => {
        expect(mockHandlers.onFilterChange).toHaveBeenCalled();
      });
    });
  });
});