import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { initializeMonacoMock } from 'jest-monaco';

import DetectionEditor from './DetectionEditor';
import { useDetection } from '../../../hooks/useDetection';
import { Detection, DetectionSeverity, PerformanceImpact } from '../../../types/detection.types';
import { PlatformType } from '../../../types/platform.types';

// Mock the useDetection hook
vi.mock('../../../hooks/useDetection', () => ({
  useDetection: vi.fn()
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, onMount }: any) => (
    <div data-testid="monaco-editor">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        data-testid="editor-textarea"
      />
    </div>
  ),
  useMonaco: () => ({
    languages: {
      register: vi.fn(),
      setMonarchTokensProvider: vi.fn()
    }
  })
}));

// Test data
const mockDetection: Detection = {
  id: 'test-detection-id',
  name: 'Test Detection',
  description: 'Test detection for unit tests',
  content: 'rule TestRule {\n  meta:\n    author = "test"\n  condition:\n    true\n}',
  platformType: PlatformType.SIEM,
  version: '1.0.0',
  owner: {
    id: 'test-user',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  },
  metadata: {
    mitreTactics: [],
    mitreTechniques: [],
    severity: DetectionSeverity.MEDIUM,
    confidence: 80,
    falsePositiveRate: 5,
    mitreVersion: '1.0',
    dataTypes: [],
    platforms: [PlatformType.SIEM],
    tags: []
  },
  qualityScore: 85,
  tags: ['test'],
  createdAt: new Date(),
  updatedAt: new Date(),
  platformConfig: {}
};

const mockValidationResult = {
  detectionId: 'test-detection-id',
  platformType: PlatformType.SIEM,
  issues: [],
  performanceImpact: PerformanceImpact.LOW,
  falsePositiveRate: 5,
  validatedAt: new Date(),
  resourceUsage: {
    cpuUsage: 10,
    memoryUsage: 50,
    ioOperations: 5,
    processingTime: 100,
    resourceScore: 90
  }
};

describe('DetectionEditor Component', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock useDetection implementation
    (useDetection as jest.Mock).mockReturnValue({
      validateDetection: vi.fn().mockResolvedValue(mockValidationResult),
      updateDetection: vi.fn().mockResolvedValue({ ...mockDetection }),
      loading: { validation: false },
      error: null
    });

    // Initialize Monaco mock
    initializeMonacoMock();
  });

  describe('Editor Initialization', () => {
    it('should render editor with initial content', () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
      expect(screen.getByTestId('editor-textarea')).toHaveValue(mockDetection.content);
    });

    it('should display correct platform type in toolbar', () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      expect(screen.getByText(`Platform: ${PlatformType.SIEM}`)).toBeInTheDocument();
    });

    it('should initialize in read-only mode when specified', () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
          readOnly={true}
        />
      );

      expect(screen.getByTestId('editor-textarea')).toHaveAttribute('readonly');
    });
  });

  describe('Content Management', () => {
    it('should handle content changes and trigger validation', async () => {
      const validateDetection = vi.fn().mockResolvedValue(mockValidationResult);
      (useDetection as jest.Mock).mockReturnValue({
        validateDetection,
        updateDetection: vi.fn(),
        loading: { validation: false },
        error: null
      });

      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      const editor = screen.getByTestId('editor-textarea');
      const newContent = 'Updated content';
      
      await userEvent.clear(editor);
      await userEvent.type(editor, newContent);

      await waitFor(() => {
        expect(validateDetection).toHaveBeenCalledWith(
          mockDetection.id,
          PlatformType.SIEM,
          expect.any(Object)
        );
      });
    });

    it('should autosave content after changes', async () => {
      const updateDetection = vi.fn().mockResolvedValue({ ...mockDetection });
      (useDetection as jest.Mock).mockReturnValue({
        validateDetection: vi.fn(),
        updateDetection,
        loading: { validation: false },
        error: null
      });

      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      const editor = screen.getByTestId('editor-textarea');
      await userEvent.clear(editor);
      await userEvent.type(editor, 'New content');

      await waitFor(() => {
        expect(updateDetection).toHaveBeenCalledWith(
          mockDetection.id,
          expect.objectContaining({ content: 'New content' })
        );
      }, { timeout: 31000 }); // Account for autosave delay
    });
  });

  describe('Validation Features', () => {
    it('should display validation status when results are available', async () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Valid')).toBeInTheDocument();
      });
    });

    it('should show validation issues when present', async () => {
      const validationWithIssues = {
        ...mockValidationResult,
        issues: [{
          id: 'issue-1',
          severity: DetectionSeverity.HIGH,
          message: 'Test validation issue',
          ruleId: 'TEST-001'
        }]
      };

      (useDetection as jest.Mock).mockReturnValue({
        validateDetection: vi.fn().mockResolvedValue(validationWithIssues),
        updateDetection: vi.fn(),
        loading: { validation: false },
        error: null
      });

      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('1 Issues')).toBeInTheDocument();
        expect(screen.getByText('Test validation issue')).toBeInTheDocument();
      });
    });
  });

  describe('Platform Preview', () => {
    it('should update preview when platform type changes', async () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      const platformSelect = screen.getByRole('combobox');
      await userEvent.selectOptions(platformSelect, PlatformType.EDR);

      expect(platformSelect).toHaveValue(PlatformType.EDR);
    });

    it('should display performance metrics in preview panel', async () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Performance Impact:/)).toBeInTheDocument();
        expect(screen.getByText(/False Positive Rate:/)).toBeInTheDocument();
        expect(screen.getByText(/Resource Usage:/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should handle keyboard navigation', () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      const resizeHandle = screen.getByRole('separator');
      expect(resizeHandle).toHaveAttribute('aria-orientation', 'vertical');
      expect(resizeHandle).toHaveAttribute('aria-label', 'Resize editor panels');
    });

    it('should maintain focus management', async () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      const editor = screen.getByTestId('editor-textarea');
      await userEvent.tab();
      expect(editor).toHaveFocus();
    });
  });

  describe('Performance Monitoring', () => {
    it('should display performance score', async () => {
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Performance: \d+%/)).toBeInTheDocument();
      });
    });

    it('should handle validation errors gracefully', async () => {
      const error = new Error('Validation failed');
      (useDetection as jest.Mock).mockReturnValue({
        validateDetection: vi.fn().mockRejectedValue(error),
        updateDetection: vi.fn(),
        loading: { validation: false },
        error: { message: 'Validation failed' }
      });

      const onError = vi.fn();
      render(
        <DetectionEditor
          detection={mockDetection}
          platformType={PlatformType.SIEM}
          onError={onError}
        />
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });
  });
});