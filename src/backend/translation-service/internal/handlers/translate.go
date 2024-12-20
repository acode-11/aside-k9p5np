// Package handlers provides gRPC handler implementations for the translation service
package handlers

import (
    "context"
    "fmt"
    "sync"
    "time"

    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
    
    "github.com/org/detection-platform/internal/services/translator" // v1.0.0
    "github.com/org/detection-platform/proto/translation" // v1.0.0
)

// TranslationHandler implements the gRPC translation service with quality metrics tracking
type TranslationHandler struct {
    translationService translator.TranslationService
    workerPool        *sync.Pool
}

// NewTranslationHandler creates a new instance of the translation handler
func NewTranslationHandler(service translator.TranslationService, workerCount int) *TranslationHandler {
    handler := &TranslationHandler{
        translationService: service,
        workerPool: &sync.Pool{
            New: func() interface{} {
                return make(chan struct{}, 1)
            },
        },
    }

    // Initialize worker pool
    for i := 0; i < workerCount; i++ {
        handler.workerPool.Put(make(chan struct{}, 1))
    }

    return handler
}

// TranslateDetection handles single detection translation requests
func (h *TranslationHandler) TranslateDetection(ctx context.Context, req *pb.TranslationRequest) (*pb.TranslationResponse, error) {
    if err := validateRequest(req); err != nil {
        return nil, status.Error(codes.InvalidArgument, err.Error())
    }

    // Create translation options from request
    options := &translator.TranslationOptions{
        Timeout:           30 * time.Second,
        OptimizationLevel: getOptimizationLevel(req.Options),
        StrictValidation:  true,
        RetryAttempts:     3,
    }

    // Perform translation
    result, err := h.translationService.TranslateDetection(
        req.Content,
        req.SourcePlatform.String(),
        req.TargetPlatform.String(),
        options,
    )
    if err != nil {
        return nil, status.Error(codes.Internal, fmt.Sprintf("translation failed: %v", err))
    }

    // Convert quality metrics to proto format
    warnings := make([]*pb.ValidationWarning, 0, len(result.Warnings))
    for _, w := range result.Warnings {
        warnings = append(warnings, &pb.ValidationWarning{
            Code:    w.Code,
            Message: w.Message,
            Level:   convertWarningLevel(w.Level),
        })
    }

    return &pb.TranslationResponse{
        DetectionId:       req.DetectionId,
        TranslatedContent: result.Content,
        TargetPlatform:   req.TargetPlatform,
        ConfidenceScore:  result.ConfidenceScore,
        Warnings:         warnings,
        TranslatedAt:     timestamppb.New(result.TranslatedAt),
    }, nil
}

// BatchTranslateDetections handles batch translation requests with parallel processing
func (h *TranslationHandler) BatchTranslateDetections(ctx context.Context, req *pb.BatchTranslationRequest) (*pb.BatchTranslationResponse, error) {
    if len(req.Requests) == 0 {
        return nil, status.Error(codes.InvalidArgument, "empty batch request")
    }

    responses := make([]*pb.TranslationResponse, 0, len(req.Requests))
    errChan := make(chan error, len(req.Requests))
    resultChan := make(chan *pb.TranslationResponse, len(req.Requests))

    var wg sync.WaitGroup
    for _, request := range req.Requests {
        wg.Add(1)
        go func(r *pb.TranslationRequest) {
            defer wg.Done()
            worker := h.workerPool.Get().(chan struct{})
            defer h.workerPool.Put(worker)

            response, err := h.TranslateDetection(ctx, r)
            if err != nil {
                errChan <- err
                return
            }
            resultChan <- response
        }(request)
    }

    // Wait for all translations to complete
    go func() {
        wg.Wait()
        close(resultChan)
        close(errChan)
    }()

    // Collect results and errors
    var successCount, failureCount int32
    for i := 0; i < len(req.Requests); i++ {
        select {
        case response := <-resultChan:
            responses = append(responses, response)
            successCount++
        case err := <-errChan:
            failureCount++
            // Log error but continue processing
            fmt.Printf("batch translation error: %v\n", err)
        }
    }

    return &pb.BatchTranslationResponse{
        Responses:    responses,
        SuccessCount: successCount,
        FailureCount: failureCount,
    }, nil
}

// ValidateTranslation performs validation without actual translation
func (h *TranslationHandler) ValidateTranslation(ctx context.Context, req *pb.TranslationRequest) (*pb.ValidationWarning, error) {
    if err := validateRequest(req); err != nil {
        return nil, status.Error(codes.InvalidArgument, err.Error())
    }

    // Validate content against target platform
    metrics, err := h.translationService.ValidateTranslation(
        req.Content,
        req.TargetPlatform.String(),
        &translator.TranslationOptions{StrictValidation: true},
    )
    if err != nil {
        return &pb.ValidationWarning{
            Code:    "VALIDATION_FAILED",
            Message: err.Error(),
            Level:   pb.WarningLevel_WARNING_LEVEL_MAJOR,
        }, nil
    }

    // Return validation result
    return &pb.ValidationWarning{
        Code:    "VALIDATION_SUCCESS",
        Message: fmt.Sprintf("Validation passed with confidence score: %.2f", metrics.ConfidenceScore),
        Level:   pb.WarningLevel_WARNING_LEVEL_INFO,
    }, nil
}

// validateRequest performs comprehensive request validation
func validateRequest(req *pb.TranslationRequest) error {
    if req == nil {
        return fmt.Errorf("nil request")
    }
    if req.Content == "" {
        return fmt.Errorf("empty detection content")
    }
    if req.SourcePlatform == pb.PlatformType_PLATFORM_TYPE_UNSPECIFIED {
        return fmt.Errorf("invalid source platform")
    }
    if req.TargetPlatform == pb.PlatformType_PLATFORM_TYPE_UNSPECIFIED {
        return fmt.Errorf("invalid target platform")
    }
    return nil
}

// getOptimizationLevel extracts optimization level from request options
func getOptimizationLevel(options map[string]string) int {
    if level, ok := options["optimization_level"]; ok {
        if l, err := strconv.Atoi(level); err == nil {
            return l
        }
    }
    return 1 // default optimization level
}

// convertWarningLevel converts internal warning levels to proto format
func convertWarningLevel(level string) pb.WarningLevel {
    switch level {
    case "INFO":
        return pb.WarningLevel_WARNING_LEVEL_INFO
    case "MINOR":
        return pb.WarningLevel_WARNING_LEVEL_MINOR
    case "MAJOR":
        return pb.WarningLevel_WARNING_LEVEL_MAJOR
    default:
        return pb.WarningLevel_WARNING_LEVEL_UNSPECIFIED
    }
}