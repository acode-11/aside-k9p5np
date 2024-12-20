package services

import (
    "context"
    "errors"
    "fmt"
    "sync"
    "time"

    "github.com/sony/gobreaker"
    "github.com/org/detection-platform/internal/models/format"
)

// TranslationOptions configures the behavior of translation operations
type TranslationOptions struct {
    Timeout           time.Duration
    OptimizationLevel int
    StrictValidation  bool
    RetryAttempts     int
}

// TranslationResult represents the output of a translation operation
type TranslationResult struct {
    Content          string
    QualityMetrics   format.QualityMetrics
    Warnings         []format.Warning
    TranslatedAt     time.Time
    ConfidenceScore  float64
}

// Translator defines the interface for platform-specific translators
type Translator interface {
    ToUDF(content string) (*format.UniversalFormat, error)
    FromUDF(udf *format.UniversalFormat) (string, error)
    ValidateContent(content string) (format.QualityMetrics, error)
}

// TranslationService manages detection content translation with resilience
type TranslationService struct {
    ctx      context.Context
    mu       *sync.RWMutex
    breaker  *gobreaker.CircuitBreaker
    cache    sync.Map
    metrics  *translationMetrics
    translators map[string]Translator
}

type translationMetrics struct {
    successCount   uint64
    failureCount   uint64
    latencySum     time.Duration
    operationCount uint64
}

// NewTranslationService creates a new instance of the translation service
func NewTranslationService(ctx context.Context) *TranslationService {
    settings := gobreaker.Settings{
        Name:          "translation-service",
        MaxRequests:   100,
        Interval:      10 * time.Second,
        Timeout:       30 * time.Second,
        ReadyToTrip: func(counts gobreaker.Counts) bool {
            failureRatio := float64(counts.TotalFailures) / float64(counts.Requests)
            return counts.Requests >= 10 && failureRatio >= 0.6
        },
    }

    return &TranslationService{
        ctx:        ctx,
        mu:         &sync.RWMutex{},
        breaker:    gobreaker.NewCircuitBreaker(settings),
        metrics:    &translationMetrics{},
        translators: make(map[string]Translator),
    }
}

// TranslateDetection performs translation between security platforms
func (s *TranslationService) TranslateDetection(
    content string,
    sourcePlatform string,
    targetPlatform string,
    options *TranslationOptions,
) (*TranslationResult, error) {
    if options == nil {
        options = &TranslationOptions{
            Timeout:           30 * time.Second,
            OptimizationLevel: 1,
            StrictValidation:  true,
            RetryAttempts:     3,
        }
    }

    ctx, cancel := context.WithTimeout(s.ctx, options.Timeout)
    defer cancel()

    // Execute translation with circuit breaker
    result, err := s.breaker.Execute(func() (interface{}, error) {
        return s.executeTranslation(ctx, content, sourcePlatform, targetPlatform, options)
    })

    if err != nil {
        return nil, fmt.Errorf("translation failed: %w", err)
    }

    return result.(*TranslationResult), nil
}

func (s *TranslationService) executeTranslation(
    ctx context.Context,
    content string,
    sourcePlatform string,
    targetPlatform string,
    options *TranslationOptions,
) (*TranslationResult, error) {
    startTime := time.Now()
    defer s.recordMetrics(startTime)

    // Get source platform translator
    sourceTranslator, ok := s.translators[sourcePlatform]
    if !ok {
        return nil, fmt.Errorf("unsupported source platform: %s", sourcePlatform)
    }

    // Get target platform translator
    targetTranslator, ok := s.translators[targetPlatform]
    if !ok {
        return nil, fmt.Errorf("unsupported target platform: %s", targetPlatform)
    }

    // Convert to Universal Detection Format
    udf, err := sourceTranslator.ToUDF(content)
    if err != nil {
        return nil, fmt.Errorf("failed to convert to UDF: %w", err)
    }

    // Validate UDF content
    if options.StrictValidation {
        if err := s.validateUDF(udf); err != nil {
            return nil, fmt.Errorf("UDF validation failed: %w", err)
        }
    }

    // Convert to target format
    translated, err := targetTranslator.FromUDF(udf)
    if err != nil {
        return nil, fmt.Errorf("failed to convert from UDF: %w", err)
    }

    // Validate translation quality
    metrics, err := s.validateTranslation(udf, translated, targetPlatform)
    if err != nil {
        return nil, fmt.Errorf("translation validation failed: %w", err)
    }

    return &TranslationResult{
        Content:         translated,
        QualityMetrics:  metrics,
        TranslatedAt:    time.Now(),
        ConfidenceScore: calculateConfidenceScore(metrics),
    }, nil
}

func (s *TranslationService) validateUDF(udf *format.UniversalFormat) error {
    if udf == nil {
        return errors.New("nil UDF content")
    }

    if udf.Content == "" {
        return errors.New("empty detection content")
    }

    return nil
}

func (s *TranslationService) validateTranslation(
    udf *format.UniversalFormat,
    translated string,
    platform string,
) (format.QualityMetrics, error) {
    translator, ok := s.translators[platform]
    if !ok {
        return format.QualityMetrics{}, fmt.Errorf("unsupported platform: %s", platform)
    }

    metrics, err := translator.ValidateContent(translated)
    if err != nil {
        return format.QualityMetrics{}, err
    }

    if metrics.AccuracyScore < 0.99 {
        return metrics, fmt.Errorf("translation accuracy below threshold: %.2f", metrics.AccuracyScore)
    }

    return metrics, nil
}

func (s *TranslationService) recordMetrics(startTime time.Time) {
    duration := time.Since(startTime)
    s.mu.Lock()
    defer s.mu.Unlock()
    
    s.metrics.operationCount++
    s.metrics.latencySum += duration
}

// GetMetrics returns current translation service metrics
func (s *TranslationService) GetMetrics() map[string]interface{} {
    s.mu.RLock()
    defer s.mu.RUnlock()

    avgLatency := float64(s.metrics.latencySum) / float64(s.metrics.operationCount)
    return map[string]interface{}{
        "total_operations": s.metrics.operationCount,
        "success_rate":    float64(s.metrics.successCount) / float64(s.metrics.operationCount),
        "avg_latency_ms":  avgLatency / float64(time.Millisecond),
    }
}

func calculateConfidenceScore(metrics format.QualityMetrics) float64 {
    // Weighted calculation of confidence score based on multiple metrics
    return (metrics.AccuracyScore * 0.6) +
           ((1 - metrics.FalsePositiveRate) * 0.3) +
           (getPerformanceScore(metrics.PerformanceImpact) * 0.1)
}

func getPerformanceScore(impact string) float64 {
    switch impact {
    case "Low":
        return 1.0
    case "Medium":
        return 0.7
    case "High":
        return 0.4
    default:
        return 0.0
    }
}