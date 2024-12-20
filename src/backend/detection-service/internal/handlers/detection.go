// Package handlers implements HTTP/gRPC handlers for the Detection Service
// with enhanced validation and quality control features.
package handlers

import (
    "context"
    "errors"
    "fmt"
    "time"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    "go.mongodb.org/mongo-driver/bson/primitive"

    "github.com/org/detection-platform/internal/models"
    "github.com/org/detection-platform/internal/services"
    detection "github.com/org/detection-platform/shared/proto/detection"
)

// Constants for handler configuration
const (
    maxPageSize = 100 // Maximum items per page for list operations
    defaultTimeout = 30 * time.Second // Default operation timeout
    minQualityScore = 0.95 // Minimum required quality score for detections
)

// Common errors
var (
    ErrInvalidRequest = errors.New("invalid request parameters")
    ErrQualityThreshold = errors.New("detection quality below required threshold")
    ErrInvalidPlatform = errors.New("invalid or unsupported platform type")
)

// DetectionHandler implements the gRPC DetectionServiceServer interface
type DetectionHandler struct {
    service services.DetectionService
    config  *config.HandlerConfig
}

// NewDetectionHandler creates a new instance of DetectionHandler
func NewDetectionHandler(svc services.DetectionService, cfg *config.HandlerConfig) *DetectionHandler {
    if svc == nil {
        panic("detection service cannot be nil")
    }
    return &DetectionHandler{
        service: svc,
        config:  cfg,
    }
}

// CreateDetection implements the CreateDetection RPC method
func (h *DetectionHandler) CreateDetection(ctx context.Context, req *detection.CreateDetectionRequest) (*detection.Detection, error) {
    if err := h.validateCreateRequest(req); err != nil {
        return nil, status.Error(codes.InvalidArgument, err.Error())
    }

    // Create domain model from request
    det := &models.Detection{}
    if err := det.FromProto(req.Detection); err != nil {
        return nil, status.Error(codes.InvalidArgument, fmt.Sprintf("invalid detection format: %v", err))
    }

    // Set creation metadata
    det.CreatedAt = time.Now()
    det.UpdatedAt = time.Now()

    // Validate detection quality
    validationResult, err := h.service.ValidateDetection(det)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("validation failed: %v", err))
    }

    if validationResult.AccuracyScore < minQualityScore {
        return nil, status.Error(codes.FailedPrecondition, fmt.Sprintf("quality score %.2f below threshold %.2f", 
            validationResult.AccuracyScore, minQualityScore))
    }

    // Create detection with timeout
    ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
    defer cancel()

    detectionID, err := h.service.CreateDetection(ctx, det)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("failed to create detection: %v", err))
    }

    // Retrieve created detection
    det, err = h.service.GetDetection(ctx, detectionID)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("failed to retrieve created detection: %v", err))
    }

    return det.ToProto(), nil
}

// GetDetection implements the GetDetection RPC method
func (h *DetectionHandler) GetDetection(ctx context.Context, req *detection.GetDetectionRequest) (*detection.Detection, error) {
    if req.DetectionId == "" {
        return nil, status.Error(codes.InvalidArgument, "detection ID is required")
    }

    detectionID, err := primitive.ObjectIDFromHex(req.DetectionId)
    if err != nil {
        return nil, status.Error(codes.InvalidArgument, "invalid detection ID format")
    }

    ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
    defer cancel()

    det, err := h.service.GetDetection(ctx, detectionID)
    if err != nil {
        if errors.Is(err, services.ErrDetectionNotFound) {
            return nil, status.Error(codes.NotFound, "detection not found")
        }
        return nil, status.Error(codes.Internal, fmt.Sprintf("failed to retrieve detection: %v", err))
    }

    return det.ToProto(), nil
}

// ListDetections implements the ListDetections RPC method
func (h *DetectionHandler) ListDetections(ctx context.Context, req *detection.ListDetectionsRequest) (*detection.ListDetectionsResponse, error) {
    if err := h.validateListRequest(req); err != nil {
        return nil, status.Error(codes.InvalidArgument, err.Error())
    }

    pageSize := int32(maxPageSize)
    if req.PageSize > 0 && req.PageSize < maxPageSize {
        pageSize = req.PageSize
    }

    ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
    defer cancel()

    opts := services.ListOptions{
        PageSize:     pageSize,
        PlatformType: models.PlatformType(req.PlatformType.String()),
        Tags:         req.Tags,
    }

    detections, err := h.service.ListDetections(ctx, opts)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("failed to list detections: %v", err))
    }

    response := &detection.ListDetectionsResponse{
        Detections: make([]*detection.Detection, len(detections)),
        TotalCount: int32(len(detections)),
    }

    for i, det := range detections {
        response.Detections[i] = det.ToProto()
    }

    return response, nil
}

// ValidateDetection implements the ValidateDetection RPC method
func (h *DetectionHandler) ValidateDetection(ctx context.Context, req *detection.ValidateDetectionRequest) (*detection.ValidationResult, error) {
    if err := h.validateValidationRequest(req); err != nil {
        return nil, status.Error(codes.InvalidArgument, err.Error())
    }

    det := &models.Detection{
        Content:      req.Content,
        PlatformType: models.PlatformType(req.PlatformType.String()),
    }

    ctx, cancel := context.WithTimeout(ctx, defaultTimeout)
    defer cancel()

    result, err := h.service.ValidateDetection(det)
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("validation failed: %v", err))
    }

    return result.ToProto(), nil
}

// Helper functions for request validation

func (h *DetectionHandler) validateCreateRequest(req *detection.CreateDetectionRequest) error {
    if req == nil || req.Detection == nil {
        return errors.New("detection is required")
    }

    if req.Detection.Name == "" {
        return errors.New("detection name is required")
    }

    if req.Detection.Content == "" {
        return errors.New("detection content is required")
    }

    if req.Detection.PlatformType == detection.PlatformType_PLATFORM_TYPE_UNSPECIFIED {
        return errors.New("platform type is required")
    }

    return nil
}

func (h *DetectionHandler) validateListRequest(req *detection.ListDetectionsRequest) error {
    if req.PageSize < 0 {
        return errors.New("page size cannot be negative")
    }

    if req.PageSize > maxPageSize {
        return fmt.Errorf("page size cannot exceed %d", maxPageSize)
    }

    return nil
}

func (h *DetectionHandler) validateValidationRequest(req *detection.ValidateDetectionRequest) error {
    if req.Content == "" {
        return errors.New("detection content is required")
    }

    if req.PlatformType == detection.PlatformType_PLATFORM_TYPE_UNSPECIFIED {
        return errors.New("platform type is required")
    }

    return nil
}