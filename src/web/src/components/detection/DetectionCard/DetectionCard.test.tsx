import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ThemeProvider } from '@mui/material';
import DetectionCard from './DetectionCard';
import { Detection, DetectionSeverity } from '../../../types/detection.types';
import { theme } from '../../../styles/theme';

// Mock detection data with comprehensive test coverage
const mockDetection: Detection = {
  id: 'test-detection-1',
  name: 'Ransomware Detection v2.1',
  description: 'Advanced ransomware detection using behavioral analysis',
  metadata: {
    mitreTactics: ['execution', 'persistence'],
    mitreTechniques: ['T1059', 'T1547'],
    severity: DetectionSeverity.HIGH,
    confidence: 0.95,
    falsePositiveRate: 0.02,
    platforms: ['splunk', 'qradar'],
    tags: ['ransomware', 'critical'],
    lastValidated: '2024-01-20T10:00:00Z'
  },
  qualityScore: 0.98,
  version: '2.1.0',
  platformType: 'SIEM',
  content: 'rule RansomwareDetection {...}',
  owner: {
    id: 'user-1',
    email: 'test@example.com'
  },
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-20'),
  platformConfig: {}
};

// Mock handlers for all interactive features
const mockHandlers = {
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onDeploy: vi.fn()
};

// Test wrapper with theme provider
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('DetectionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render detection card in list mode with all content', () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      // Verify core content
      expect(screen.getByText(mockDetection.name)).toBeInTheDocument();
      expect(screen.getByText(mockDetection.description)).toBeInTheDocument();
      
      // Verify metadata
      expect(screen.getByText(DetectionSeverity.HIGH)).toBeInTheDocument();
      expect(screen.getByText('98%')).toBeInTheDocument();
      
      // Verify platforms
      mockDetection.metadata.platforms.forEach(platform => {
        expect(screen.getByText(platform)).toBeInTheDocument();
      });
    });

    it('should render detection card in grid mode with responsive layout', () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="grid"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const card = screen.getByTestId('detection-card');
      expect(card).toHaveStyle({ width: '100%' });
    });

    it('should render loading skeleton when isLoading is true', () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          isLoading={true}
          testId="detection-card"
          {...mockHandlers}
        />
      );

      expect(screen.getByTestId('detection-card-loading')).toBeInTheDocument();
      expect(screen.queryByText(mockDetection.name)).not.toBeInTheDocument();
    });

    it('should render last validated date when available', () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      expect(screen.getByText(/Last validated:/)).toBeInTheDocument();
      expect(screen.getByText(/2024-01-20/)).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const editButton = screen.getByLabelText('Edit detection');
      await userEvent.click(editButton);

      expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockDetection);
    });

    it('should call onDelete when delete button is clicked', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const deleteButton = screen.getByLabelText('Delete detection');
      await userEvent.click(deleteButton);

      expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockDetection.id);
    });

    it('should call onDeploy when deploy button is clicked', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const deployButton = screen.getByLabelText('Deploy detection');
      await userEvent.click(deployButton);

      expect(mockHandlers.onDeploy).toHaveBeenCalledWith(mockDetection);
    });

    it('should show tooltips on hover', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const editButton = screen.getByLabelText('Edit detection');
      await userEvent.hover(editButton);

      await waitFor(() => {
        expect(screen.getByText('Edit Detection')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', `Detection: ${mockDetection.name}`);
    });

    it('should be keyboard navigable', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const card = screen.getByTestId('detection-card');
      card.focus();
      expect(card).toHaveFocus();

      // Test keyboard navigation through action buttons
      await userEvent.tab();
      expect(screen.getByLabelText('Edit detection')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Share detection')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Deploy detection')).toHaveFocus();

      await userEvent.tab();
      expect(screen.getByLabelText('Delete detection')).toHaveFocus();
    });

    it('should handle touch interactions', async () => {
      renderWithTheme(
        <DetectionCard
          detection={mockDetection}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      const card = screen.getByTestId('detection-card');
      await userEvent.click(card);

      // Verify ripple effect presence
      const ripple = within(card).getByRole('presentation');
      expect(ripple).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing metadata gracefully', () => {
      const detectionWithoutMetadata = {
        ...mockDetection,
        metadata: {
          ...mockDetection.metadata,
          platforms: [],
          lastValidated: undefined
        }
      };

      renderWithTheme(
        <DetectionCard
          detection={detectionWithoutMetadata}
          viewMode="list"
          testId="detection-card"
          {...mockHandlers}
        />
      );

      // Verify card still renders without optional metadata
      expect(screen.getByText(detectionWithoutMetadata.name)).toBeInTheDocument();
    });
  });
});