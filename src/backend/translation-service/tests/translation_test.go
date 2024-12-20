package tests

import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"

    "github.com/org/detection-platform/internal/services"
    "github.com/org/detection-platform/proto/translation"
    "github.com/org/detection-platform/proto/detection"
)

// mockTranslationService implements a mock translation service for testing
type mockTranslationService struct {
    mock.Mock
    metrics map[string]float64
    rules   map[string][]string
    mu      sync.RWMutex
}

func newMockTranslationService() *mockTranslationService {
    return &mockTranslationService{
        metrics: make(map[string]float64),
        rules:   make(map[string][]string),
    }
}

// TestTranslateDetection verifies translation functionality and quality metrics
func TestTranslateDetection(t *testing.T) {
    // Set up test context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Initialize mock service
    mockService := newMockTranslationService()
    translationService := services.NewTranslationService(ctx)

    // Test cases for different platform combinations
    testCases := []struct {
        name           string
        sourcePlatform detection.PlatformType
        targetPlatform detection.PlatformType
        content        string
        expectedScore  float64
        expectError    bool
    }{
        {
            name:           "SIEM to EDR Translation",
            sourcePlatform: detection.PlatformType_PLATFORM_TYPE_SIEM,
            targetPlatform: detection.PlatformType_PLATFORM_TYPE_EDR,
            content:        `alert tcp any any -> any any (msg:"Test Detection"; content:"malicious"; sid:1000001;)`,
            expectedScore:  0.99,
            expectError:    false,
        },
        {
            name:           "EDR to NSM Translation",
            sourcePlatform: detection.PlatformType_PLATFORM_TYPE_EDR,
            targetPlatform: detection.PlatformType_PLATFORM_TYPE_NSM,
            content:        `process where process.name = "malware.exe"`,
            expectedScore:  0.99,
            expectError:    false,
        },
        {
            name:           "Invalid Platform Translation",
            sourcePlatform: detection.PlatformType_PLATFORM_TYPE_UNSPECIFIED,
            targetPlatform: detection.PlatformType_PLATFORM_TYPE_SIEM,
            content:        `invalid content`,
            expectedScore:  0,
            expectError:    true,
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            // Create translation request
            req := &translation.TranslationRequest{
                Content:        tc.content,
                SourcePlatform: tc.sourcePlatform,
                TargetPlatform: tc.targetPlatform,
            }

            // Execute translation
            result, err := translationService.TranslateDetection(
                tc.content,
                tc.sourcePlatform.String(),
                tc.targetPlatform.String(),
                &services.TranslationOptions{
                    Timeout:           10 * time.Second,
                    OptimizationLevel: 2,
                    StrictValidation:  true,
                },
            )

            // Verify results
            if tc.expectError {
                assert.Error(t, err)
                return
            }

            assert.NoError(t, err)
            assert.NotNil(t, result)
            assert.GreaterOrEqual(t, result.ConfidenceScore, tc.expectedScore)
            assert.NotEmpty(t, result.Content)
            assert.NotNil(t, result.QualityMetrics)
            assert.Less(t, result.QualityMetrics.FalsePositiveRate, 0.05)
        })
    }
}

// TestBatchTranslation verifies concurrent batch translation capabilities
func TestBatchTranslation(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
    defer cancel()

    mockService := newMockTranslationService()
    translationService := services.NewTranslationService(ctx)

    // Create large batch of test detections
    batchSize := 100
    var requests []*translation.TranslationRequest
    for i := 0; i < batchSize; i++ {
        requests = append(requests, &translation.TranslationRequest{
            DetectionId:     fmt.Sprintf("test-detection-%d", i),
            Content:        fmt.Sprintf(`alert tcp any any -> any any (msg:"Test Detection %d"; sid:%d;)`, i, 1000000+i),
            SourcePlatform: detection.PlatformType_PLATFORM_TYPE_SIEM,
            TargetPlatform: detection.PlatformType_PLATFORM_TYPE_EDR,
        })
    }

    // Execute batch translation
    var wg sync.WaitGroup
    results := make(chan *services.TranslationResult, batchSize)
    errors := make(chan error, batchSize)

    for _, req := range requests {
        wg.Add(1)
        go func(r *translation.TranslationRequest) {
            defer wg.Done()

            result, err := translationService.TranslateDetection(
                r.Content,
                r.SourcePlatform.String(),
                r.TargetPlatform.String(),
                &services.TranslationOptions{
                    Timeout:           5 * time.Second,
                    OptimizationLevel: 1,
                },
            )

            if err != nil {
                errors <- err
                return
            }
            results <- result
        }(req)
    }

    // Wait for all translations to complete
    wg.Wait()
    close(results)
    close(errors)

    // Verify batch results
    successCount := len(results)
    failureCount := len(errors)

    assert.Greater(t, successCount, int(float64(batchSize)*0.95))
    assert.Less(t, failureCount, int(float64(batchSize)*0.05))

    // Verify quality metrics for successful translations
    for result := range results {
        assert.GreaterOrEqual(t, result.ConfidenceScore, 0.95)
        assert.Less(t, result.QualityMetrics.FalsePositiveRate, 0.05)
    }
}

// TestValidateTranslation verifies platform-specific validation rules
func TestValidateTranslation(t *testing.T) {
    ctx := context.Background()
    translationService := services.NewTranslationService(ctx)

    testCases := []struct {
        name        string
        content     string
        platform    detection.PlatformType
        expectValid bool
        warnings    []string
    }{
        {
            name:        "Valid SIEM Detection",
            content:     `alert tcp any any -> any any (msg:"Valid Test"; content:"malicious"; sid:1000001;)`,
            platform:    detection.PlatformType_PLATFORM_TYPE_SIEM,
            expectValid: true,
            warnings:    nil,
        },
        {
            name:        "Performance Warning",
            content:     `alert tcp any any -> any any (msg:"Heavy Test"; pcre:"/.*malicious.*/"; sid:1000002;)`,
            platform:    detection.PlatformType_PLATFORM_TYPE_SIEM,
            expectValid: true,
            warnings:    []string{"High performance impact detected"},
        },
        {
            name:        "Invalid Syntax",
            content:     `invalid detection syntax`,
            platform:    detection.PlatformType_PLATFORM_TYPE_SIEM,
            expectValid: false,
            warnings:    []string{"Invalid detection syntax"},
        },
    }

    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            result, err := translationService.TranslateDetection(
                tc.content,
                tc.platform.String(),
                tc.platform.String(),
                &services.TranslationOptions{
                    StrictValidation: true,
                },
            )

            if !tc.expectValid {
                assert.Error(t, err)
                return
            }

            assert.NoError(t, err)
            assert.NotNil(t, result)

            // Verify warnings
            if len(tc.warnings) > 0 {
                assert.Len(t, result.QualityMetrics.ValidationWarnings, len(tc.warnings))
                for i, warning := range tc.warnings {
                    assert.Contains(t, result.QualityMetrics.ValidationWarnings[i].Message, warning)
                }
            }
        })
    }
}