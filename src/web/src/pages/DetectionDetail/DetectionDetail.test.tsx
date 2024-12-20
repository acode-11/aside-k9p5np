import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';

import DetectionDetail from './DetectionDetail';
import { useDetection } from '../../hooks/useDetection';
import { useAuth } from '../../hooks/useAuth';
import { PlatformType } from '../../types/platform.types';
import { DetectionSeverity, PerformanceImpact } from '../../types/detection.types';
import { createTheme } from '../../theme';

// Mock hooks
vi.mock('../../hooks/useDetection');
vi.mock('../../hooks/useAuth');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-detection-id' }),
    useLocation: () => ({ search: '?platform=SIEM' })
  };
});

// Test data
const mockDetection = {
  id: 'test-detection-id',
  name: 'Test Detection Rule',
  description: 'Test detection description',
  content: 'rule test_detection { condition: true }',
  platformType: PlatformType.SIEM,
  version: '1.0.0',
  metadata: {
    mitreTactics: ['execution', 'persistence'],
    severity: DetectionSeverity.HIGH,
    confidence: 0.95,
    platforms: ['splunk', 'qradar', 'sentinel']
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01')
};

const mockValidationResult = {
  detectionId: 'test-detection-id',
  issues: [],
  performanceImpact: PerformanceImpact.LOW,
  falsePositiveRate: 0.02,
  platformCompatibility: {
    splunk: { compatible: true, warnings: [] },
    qradar: { compatible: true, warnings: [] }
  },
  validatedAt: new Date('2023-01-01')
};

// Helper function to render component with providers
const renderWithProviders = (ui: React.ReactNode) => {
  const theme = createTheme('light');
  return render(
    <Provider store={vi.fn()()}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          {ui}
        </ThemeProvider>
      </BrowserRouter>
    </Provider>
  );
};

describe('DetectionDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mock implementations
    (useDetection as jest.Mock).mockReturnValue({
      fetchDetectionById: vi.fn().mockResolvedValue(mockDetection),
      updateDetection: vi.fn().mockResolvedValue(mockDetection),
      validateDetection: vi.fn().mockResolvedValue(mockValidationResult),
      loading: { detections: false },
      error: null
    });

    (useAuth as jest.Mock).mockReturnValue({
      requireMFA: vi.fn().mockResolvedValue(true)
    });
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        loading: { detections: true }
      });

      renderWithProviders(<DetectionDetail />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should display detection details after loading', async () => {
      renderWithProviders(<DetectionDetail />);

      await waitFor(() => {
        expect(screen.getByText(mockDetection.name)).toBeInTheDocument();
        expect(screen.getByText(mockDetection.description)).toBeInTheDocument();
      });
    });

    it('should show error state on fetch failure', async () => {
      const errorMessage = 'Failed to load detection';
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        error: { message: errorMessage }
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should maintain accessibility standards', async () => {
      const { container } = renderWithProviders(<DetectionDetail />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Detection Operations', () => {
    it('should handle detection content updates', async () => {
      const updateDetection = vi.fn().mockResolvedValue(mockDetection);
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        updateDetection
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        fireEvent.change(editor, { target: { value: 'Updated content' } });
      });

      expect(updateDetection).toHaveBeenCalledWith(
        'test-detection-id',
        expect.objectContaining({ content: 'Updated content' })
      );
    });

    it('should validate detection rules', async () => {
      const validateDetection = vi.fn().mockResolvedValue(mockValidationResult);
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        validateDetection
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const validateButton = screen.getByRole('button', { name: /validate/i });
        fireEvent.click(validateButton);
      });

      expect(validateDetection).toHaveBeenCalledWith(
        'test-detection-id',
        PlatformType.SIEM,
        expect.any(Object)
      );
    });

    it('should show platform-specific previews', async () => {
      renderWithProviders(<DetectionDetail />);
      
      await waitFor(() => {
        const platformSelect = screen.getByRole('combobox');
        fireEvent.change(platformSelect, { target: { value: PlatformType.EDR } });
      });

      expect(screen.getByText(/Platform: EDR/i)).toBeInTheDocument();
    });

    it('should handle batch operations', async () => {
      const batchUpdateDetections = vi.fn().mockResolvedValue([mockDetection]);
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        batchUpdateDetections
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const batchButton = screen.getByRole('button', { name: /batch/i });
        fireEvent.click(batchButton);
      });

      expect(batchUpdateDetections).toHaveBeenCalled();
    });
  });

  describe('Security Features', () => {
    it('should require MFA for sensitive operations', async () => {
      const requireMFA = vi.fn().mockResolvedValue(true);
      (useAuth as jest.Mock).mockReturnValue({
        requireMFA
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const deployButton = screen.getByRole('button', { name: /deploy/i });
        fireEvent.click(deployButton);
      });

      expect(requireMFA).toHaveBeenCalled();
    });

    it('should validate user permissions', async () => {
      const mockPermissionCheck = vi.fn().mockReturnValue(true);
      (useAuth as jest.Mock).mockReturnValue({
        ...useAuth(),
        checkPermission: mockPermissionCheck
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const editButton = screen.getByRole('button', { name: /edit/i });
        expect(editButton).toBeEnabled();
      });
    });

    it('should maintain audit trail', async () => {
      const updateDetection = vi.fn().mockResolvedValue({
        ...mockDetection,
        auditLog: [{ action: 'update', timestamp: new Date() }]
      });

      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        updateDetection
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const historyTab = screen.getByRole('tab', { name: /history/i });
        fireEvent.click(historyTab);
      });

      expect(screen.getByText(/audit log/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should meet response time thresholds', async () => {
      const startTime = performance.now();
      renderWithProviders(<DetectionDetail />);
      
      await waitFor(() => {
        expect(screen.getByText(mockDetection.name)).toBeInTheDocument();
      });

      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(1000); // 1 second threshold
    });

    it('should handle large detection content', async () => {
      const largeContent = 'rule '.repeat(1000);
      const largeDetection = { ...mockDetection, content: largeContent };
      
      (useDetection as jest.Mock).mockReturnValue({
        ...useDetection(),
        fetchDetectionById: vi.fn().mockResolvedValue(largeDetection)
      });

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        expect(screen.getByText(/rule/i)).toBeInTheDocument();
      });
    });

    it('should optimize re-renders', async () => {
      const renderCount = vi.fn();
      const user = userEvent.setup();

      renderWithProviders(<DetectionDetail />);
      await waitFor(() => {
        const editor = screen.getByRole('textbox');
        user.type(editor, 'test');
      });

      expect(renderCount).toHaveBeenCalledTimes(1);
    });
  });
});