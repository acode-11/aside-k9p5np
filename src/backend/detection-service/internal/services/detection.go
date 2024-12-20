// Package services implements core business logic for the detection service
package services

import (
    "context"
    "errors"
    "time"

    "go.mongodb.org/mongo-driver/bson/primitive" // v1.12.1

    "github.com/org/detection-platform/internal/models"
    "github.com/org/detection-platform/internal/repository"
    "github.com/org/detection-platform/internal/validation"
)

// Global error definitions
var (
    ErrDetectionNotFound       = errors.New("detection not found")
    ErrInvalidDetection       = errors.New("invalid detection")
    ErrQualityThresholdNotMet = errors.New("detection quality below required threshold")
    ErrPlatformIncompatible   = errors.New("detection incompatible with target platform")
)

// DetectionService implements core detection management functionality
type DetectionService struct {
    repo             *repository.MongoRepository
    qualityScorer    *validation.QualityScorer
    platformValidator *validation.PlatformValidator
}

// NewDetectionService creates a new instance of DetectionService
func NewDetectionService(
    repo *repository.MongoRepository,
    qualityScorer *validation.QualityScorer,
    platformValidator *validation.PlatformValidator,
) *DetectionService {
    return &DetectionService{
        repo:             repo,
        qualityScorer:    qualityScorer,
        platformValidator: platformValidator,
    }
}

// CreateDetection creates a new detection with comprehensive validation
func (s *DetectionService) CreateDetection(ctx context.Context, detection *models.Detection) (primitive.ObjectID, error) {
    // Validate detection fields
    if err := s.validateDetection(detection); err != nil {
        return primitive.NilObjectID, err
    }

    // Validate detection content and quality
    validationResult, err := validation.ValidateDetection(detection)
    if err != nil {
        return primitive.NilObjectID, err
    }

    // Check quality threshold
    if validationResult.AccuracyScore < models.QualityThreshold {
        return primitive.NilObjectID, ErrQualityThresholdNotMet
    }

    // Validate platform compatibility
    if err := s.validatePlatformCompatibility(detection); err != nil {
        return primitive.NilObjectID, err
    }

    // Enrich detection metadata
    detection.QualityScore = validationResult.AccuracyScore
    detection.PlatformValidations = map[models.PlatformType]models.ValidationResult{
        detection.PlatformType: *validationResult,
    }

    // Create detection with transaction support
    detectionID, err := s.repo.CreateDetection(ctx, detection)
    if err != nil {
        return primitive.NilObjectID, err
    }

    return detectionID, nil
}

// GetDetection retrieves a detection by ID
func (s *DetectionService) GetDetection(ctx context.Context, id primitive.ObjectID) (*models.Detection, error) {
    detection, err := s.repo.GetDetectionByID(ctx, id)
    if err != nil {
        return nil, ErrDetectionNotFound
    }
    return detection, nil
}

// UpdateDetection updates an existing detection with validation
func (s *DetectionService) UpdateDetection(ctx context.Context, detection *models.Detection) error {
    // Validate detection exists
    existing, err := s.GetDetection(ctx, detection.ID)
    if err != nil {
        return err
    }

    // Validate updates
    if err := s.validateDetection(detection); err != nil {
        return err
    }

    // Validate content and quality
    validationResult, err := validation.ValidateDetection(detection)
    if err != nil {
        return err
    }

    if validationResult.AccuracyScore < models.QualityThreshold {
        return ErrQualityThresholdNotMet
    }

    // Update metadata
    detection.QualityScore = validationResult.AccuracyScore
    detection.UpdatedAt = time.Now()
    detection.PlatformValidations[detection.PlatformType] = *validationResult

    // Create new version
    version := &models.DetectionVersion{
        DetectionID: detection.ID,
        Content:    detection.Content,
        Changes:    detection.Metadata["changes"],
        Author:     detection.Owner,
        CreatedAt:  time.Now(),
    }

    // Update with transaction support
    return s.repo.UpdateDetection(ctx, detection, version)
}

// DeleteDetection removes a detection
func (s *DetectionService) DeleteDetection(ctx context.Context, id primitive.ObjectID) error {
    return s.repo.DeleteDetection(ctx, id)
}

// ListDetections retrieves detections with filtering
func (s *DetectionService) ListDetections(ctx context.Context, opts repository.ListOptions) ([]*models.Detection, error) {
    return s.repo.ListDetections(ctx, opts)
}

// ValidateDetection performs comprehensive validation
func (s *DetectionService) ValidateDetection(detection *models.Detection) (*models.ValidationResult, error) {
    return validation.ValidateDetection(detection)
}

// GetVersionHistory retrieves version history for a detection
func (s *DetectionService) GetVersionHistory(ctx context.Context, detectionID primitive.ObjectID) ([]*models.DetectionVersion, error) {
    return s.repo.GetVersionHistory(ctx, detectionID)
}

// GetQualityMetrics retrieves quality metrics for a detection
func (s *DetectionService) GetQualityMetrics(ctx context.Context, detectionID primitive.ObjectID) (*models.QualityMetrics, error) {
    detection, err := s.GetDetection(ctx, detectionID)
    if err != nil {
        return nil, err
    }

    validationResult, err := validation.ValidateDetection(detection)
    if err != nil {
        return nil, err
    }

    return &models.QualityMetrics{
        Score:             detection.QualityScore,
        AccuracyScore:     validationResult.AccuracyScore,
        FalsePositiveRate: validationResult.FalsePositiveRate,
        PerformanceImpact: validationResult.PerformanceImpact,
    }, nil
}

// ValidatePlatformCompatibility checks platform compatibility
func (s *DetectionService) ValidatePlatformCompatibility(detection *models.Detection) error {
    return s.platformValidator.ValidateCompatibility(detection)
}

// Helper functions

func (s *DetectionService) validateDetection(detection *models.Detection) error {
    if detection == nil {
        return ErrInvalidDetection
    }

    if detection.Name == "" || detection.Description == "" || detection.Content == "" {
        return ErrInvalidDetection
    }

    if detection.PlatformType == "" {
        return ErrInvalidDetection
    }

    if detection.Owner.ID == "" || detection.Owner.Username == "" {
        return ErrInvalidDetection
    }

    return nil
}

func (s *DetectionService) validatePlatformCompatibility(detection *models.Detection) error {
    if !s.platformValidator.IsCompatible(detection.PlatformType, detection.Content) {
        return ErrPlatformIncompatible
    }
    return nil
}