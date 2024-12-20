// Package tests provides comprehensive test coverage for the Detection Service
package tests

import (
    "context"
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    "github.com/stretchr/testify/require"
    "go.mongodb.org/mongo-driver/bson/primitive"

    "github.com/org/detection-platform/internal/models"
    "github.com/org/detection-platform/internal/services"
    "github.com/org/detection-platform/internal/validation"
)

const (
    testTimeout = 5 * time.Second
)

// TestData holds reusable test fixtures
type TestData struct {
    ValidDetection   *models.Detection
    InvalidDetection *models.Detection
    TestUser        models.User
    TestObjectID    primitive.ObjectID
}

// Mock implementations
type MockDetectionRepository struct {
    mock.Mock
}

type MockQualityScorer struct {
    mock.Mock
}

type MockPlatformValidator struct {
    mock.Mock
}

var (
    mockRepo      *MockDetectionRepository
    mockScorer    *MockQualityScorer
    mockValidator *MockPlatformValidator
    testData     TestData
)

// TestMain handles test suite setup and teardown
func TestMain(m *testing.M) {
    // Initialize test data
    testData = initTestData()
    
    // Initialize mocks
    mockRepo = new(MockDetectionRepository)
    mockScorer = new(MockQualityScorer)
    mockValidator = new(MockPlatformValidator)

    // Run tests
    m.Run()
}

// TestCreateDetection tests the detection creation flow
func TestCreateDetection(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
    defer cancel()

    tests := []struct {
        name          string
        detection     *models.Detection
        expectError   bool
        errorType     error
        setupMocks    func()
    }{
        {
            name:      "Valid Detection Creation",
            detection: testData.ValidDetection,
            setupMocks: func() {
                // Setup validation expectations
                mockValidator.On("ValidateDetection", mock.Anything).Return(
                    &models.ValidationResult{
                        AccuracyScore: 0.99,
                        FalsePositiveRate: 0.01,
                        PerformanceImpact: "low",
                    }, nil)

                // Setup repository expectations
                mockRepo.On("CreateDetection", mock.Anything, mock.Anything).Return(
                    testData.TestObjectID, nil)
            },
        },
        {
            name:        "Invalid Detection",
            detection:   testData.InvalidDetection,
            expectError: true,
            errorType:   services.ErrInvalidDetection,
            setupMocks: func() {
                mockValidator.On("ValidateDetection", mock.Anything).Return(
                    nil, services.ErrInvalidDetection)
            },
        },
        {
            name:        "Quality Threshold Not Met",
            detection:   testData.ValidDetection,
            expectError: true,
            errorType:   services.ErrQualityThresholdNotMet,
            setupMocks: func() {
                mockValidator.On("ValidateDetection", mock.Anything).Return(
                    &models.ValidationResult{
                        AccuracyScore: 0.80,
                        FalsePositiveRate: 0.10,
                        PerformanceImpact: "high",
                    }, nil)
            },
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup test mocks
            tt.setupMocks()

            // Create service instance
            svc := services.NewDetectionService(mockRepo, mockScorer, mockValidator)

            // Execute test
            id, err := svc.CreateDetection(ctx, tt.detection)

            // Verify results
            if tt.expectError {
                assert.Error(t, err)
                assert.Equal(t, tt.errorType, err)
                assert.Equal(t, primitive.NilObjectID, id)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, testData.TestObjectID, id)
            }

            // Verify mock expectations
            mockRepo.AssertExpectations(t)
            mockValidator.AssertExpectations(t)
        })
    }
}

// TestQualityValidation tests detection quality validation
func TestQualityValidation(t *testing.T) {
    tests := []struct {
        name           string
        detection      *models.Detection
        expectedScore  float64
        expectedFPRate float64
        expectError    bool
    }{
        {
            name:           "High Quality Detection",
            detection:      testData.ValidDetection,
            expectedScore:  0.99,
            expectedFPRate: 0.01,
            expectError:    false,
        },
        {
            name: "Detection with Performance Issues",
            detection: &models.Detection{
                Content: `rule test {
                    strings:
                        $s1 = "test" nocase fullword
                        $s2 = "test2" nocase fullword
                    condition:
                        all of them
                }`,
                PlatformType: models.PlatformTypeSIEM,
            },
            expectedScore:  0.85,
            expectedFPRate: 0.03,
            expectError:    false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Setup validation
            result, err := validation.ValidateDetection(tt.detection)

            if tt.expectError {
                assert.Error(t, err)
                return
            }

            require.NoError(t, err)
            assert.NotNil(t, result)
            
            // Verify quality metrics
            assert.InDelta(t, tt.expectedScore, result.AccuracyScore, 0.01)
            assert.InDelta(t, tt.expectedFPRate, result.FalsePositiveRate, 0.01)
            
            // Verify platform compatibility
            assert.NotEmpty(t, result.PlatformMetrics)
            assert.Contains(t, []string{"low", "medium", "high"}, result.PerformanceImpact)
        })
    }
}

// TestVersionControl tests detection version management
func TestVersionControl(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), testTimeout)
    defer cancel()

    tests := []struct {
        name        string
        detection   *models.Detection
        setupMocks  func()
        expectError bool
    }{
        {
            name:      "Create New Version",
            detection: testData.ValidDetection,
            setupMocks: func() {
                mockRepo.On("GetDetectionByID", mock.Anything, mock.Anything).Return(
                    testData.ValidDetection, nil)
                mockRepo.On("UpdateDetection", mock.Anything, mock.Anything, mock.Anything).Return(nil)
            },
            expectError: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            tt.setupMocks()

            svc := services.NewDetectionService(mockRepo, mockScorer, mockValidator)
            err := svc.UpdateDetection(ctx, tt.detection)

            if tt.expectError {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }

            mockRepo.AssertExpectations(t)
        })
    }
}

// Helper functions

func initTestData() TestData {
    objectID := primitive.NewObjectID()
    
    testUser := models.User{
        ID:       "test-user-id",
        Username: "testuser",
        Email:    "test@example.com",
    }

    validDetection := &models.Detection{
        ID:          objectID,
        Name:        "Test Detection",
        Description: "Test detection for unit tests",
        Content:     "rule test { condition: true }",
        PlatformType: models.PlatformTypeSIEM,
        Version:     "1.0.0",
        Owner:       testUser,
        Metadata:    map[string]string{"test": "value"},
        QualityScore: 0.99,
        Tags:        []string{"test"},
        CreatedAt:   time.Now(),
        UpdatedAt:   time.Now(),
    }

    invalidDetection := &models.Detection{
        Name:        "",  // Invalid: empty name
        Description: "",  // Invalid: empty description
        Content:     "",  // Invalid: empty content
        PlatformType: "", // Invalid: empty platform
    }

    return TestData{
        ValidDetection:   validDetection,
        InvalidDetection: invalidDetection,
        TestUser:        testUser,
        TestObjectID:    objectID,
    }
}