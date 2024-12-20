import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import DetectionPreview from './DetectionPreview';
import { Detection, DetectionSeverity, PerformanceImpact } from '../../../types/detection.types';
import { PlatformType } from '../../../types/platform.types';
import detectionService from '../../../services/detection.service';

// Mock detection service
vi.mock('../../../services/detection.service', () => ({
  default: {
    validateDetection: vi.fn(),
    translateDetection: vi.fn()
  }
}));

// Mock validation response
const mockValidationResult = {
  detectionId: 'test-detection-1',
  platformType: PlatformType.SIEM,
  issues: [],
  performanceImpact: PerformanceImpact.LOW,
  falsePositiveRate: 2,
  validatedAt: new Date(),
  resourceUsage: {
    cpuUsage: 5,
    memoryUsage: 100,
    ioOperations: 10,
    processingTime: 150,
    resourceScore: 95
  }
};

// Mock detection data
const mockDetection: Detection = {
  id: 'test-detection-1',
  name: 'Test Detection',
  description: 'Test detection for unit tests',
  content: 'rule test_detection { condition: true }',
  platformType: PlatformType.SIEM,
  version: '1.0.0',
  owner: {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'CONTRIBUTOR',
    organizationId: 'org-1',
    teamIds: [],
    platformPermissions: {},
    preferences: {
      theme: 'LIGHT',
      notifications: 'IMPORTANT',
      defaultPlatform: PlatformType.SIEM
    },
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  metadata: {
    mitreTactics: [],
    mitreTechniques: [],
    severity: DetectionSeverity.MEDIUM,
    confidence: 85,
    falsePositiveRate: 2,
    mitreVersion: '1.0',
    dataTypes: [],
    platforms: [PlatformType.SIEM],
    tags: []
  },
  qualityScore: 90,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  platformConfig: {}
};

describe('DetectionPreview Component', () => {
  // Setup before each test
  beforeEach(() => {
    vi.resetAllMocks();
    (detectionService.validateDetection as jest.Mock).mockResolvedValue(mockValidationResult);
    (detectionService.translateDetection as jest.Mock).mockResolvedValue('Translated content');
  });

  // Helper function to render component
  const renderComponent = (props = {}) => {
    const user = userEvent.setup();
    return {
      user,
      ...render(
        <DetectionPreview
          detection={mockDetection}
          onDeploy={vi.fn()}
          {...props}
        />
      )
    };
  };

  it('renders detection content with proper formatting', async () => {
    const { container } = renderComponent();

    // Verify content display
    expect(screen.getByText(/rule test_detection/)).toBeInTheDocument();
    expect(container.querySelector('pre')).toHaveStyle({
      margin: 0
    });

    // Verify platform selector presence
    const platformSelect = screen.getByLabelText('Platform Selection');
    expect(platformSelect).toBeInTheDocument();
    expect(platformSelect).toHaveValue(PlatformType.SIEM);
  });

  it('handles platform change and triggers validation', async () => {
    const { user } = renderComponent();

    // Select new platform
    const platformSelect = screen.getByLabelText('Platform Selection');
    await user.selectOptions(platformSelect, PlatformType.EDR);

    // Verify validation call
    await waitFor(() => {
      expect(detectionService.validateDetection).toHaveBeenCalledWith(
        mockDetection.id,
        PlatformType.EDR,
        expect.any(Object)
      );
    });

    // Verify updated content
    expect(screen.getByText('Translated content')).toBeInTheDocument();
  });

  it('displays validation results with metrics', async () => {
    const { container } = renderComponent();

    // Wait for validation results
    await waitFor(() => {
      expect(screen.getByText('Validation Results')).toBeInTheDocument();
    });

    // Verify metrics display
    const validationSection = screen.getByRole('complementary', {
      name: 'Validation Results'
    });

    expect(within(validationSection).getByText(/Performance Impact/)).toBeInTheDocument();
    expect(within(validationSection).getByText('LOW')).toBeInTheDocument();

    // Verify resource score tooltip
    const performanceIndicator = within(validationSection).getByText('LOW');
    expect(performanceIndicator).toHaveAttribute('title', expect.stringContaining('95%'));
  });

  it('handles validation errors appropriately', async () => {
    // Mock validation error
    (detectionService.validateDetection as jest.Mock).mockRejectedValue(
      new Error('Validation failed')
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Validation failed')).toBeInTheDocument();
    });

    // Verify error display
    const errorAlert = screen.getByRole('alert');
    expect(errorAlert).toBeInTheDocument();
    expect(errorAlert).toHaveTextContent('Validation failed');
  });

  it('supports keyboard navigation and accessibility', async () => {
    const { user } = renderComponent();

    // Test keyboard navigation
    const previewContainer = screen.getByRole('region', {
      name: 'Detection Preview'
    });
    
    await user.tab();
    expect(previewContainer).toHaveFocus();

    // Test platform selector keyboard interaction
    const platformSelect = screen.getByLabelText('Platform Selection');
    await user.tab();
    expect(platformSelect).toHaveFocus();

    // Verify ARIA labels
    expect(screen.getByLabelText('Detection code')).toBeInTheDocument();
    expect(screen.getByLabelText('Validation Results')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    renderComponent({ isLoading: true });

    // Verify loading skeleton
    const skeleton = screen.getByRole('progressbar');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('MuiSkeleton-root');
  });

  it('updates validation results when detection content changes', async () => {
    const { rerender } = renderComponent();

    // Update detection content
    const updatedDetection = {
      ...mockDetection,
      content: 'rule updated_detection { condition: false }'
    };

    rerender(
      <DetectionPreview
        detection={updatedDetection}
        onDeploy={vi.fn()}
      />
    );

    // Verify validation is triggered
    await waitFor(() => {
      expect(detectionService.validateDetection).toHaveBeenCalledWith(
        mockDetection.id,
        PlatformType.SIEM,
        expect.any(Object)
      );
    });
  });
});