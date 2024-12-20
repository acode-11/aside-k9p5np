// Package validation implements comprehensive validation rules and quality assessment
// for security detections across multiple platforms.
package validation

import (
    "errors"
    "regexp"
    "strings"
    "sync"

    "github.com/org/detection-platform/internal/models/detection" // v1.0.0
)

// ValidationRule defines a single validation rule with quality metrics
type ValidationRule struct {
    Name              string
    Description       string
    Severity         detection.SeverityLevel
    PerformanceImpact float64
    FalsePositiveRate float64
    Validate         func(*detection.Detection) []ValidationIssue
}

// ValidationIssue represents a specific validation problem
type ValidationIssue struct {
    Code     string
    Message  string
    Severity detection.SeverityLevel
    Location string
}

// QualityMetrics represents quality measurements for validation results
type QualityMetrics struct {
    Score             float64
    PerformanceImpact float64
    FalsePositiveRate float64
    AccuracyScore     float64
}

// ValidationRuleSet represents a collection of validation rules
type ValidationRuleSet map[string]ValidationRule

// Cache for validation results to improve performance
var validationCache = struct {
    sync.RWMutex
    cache map[string]*detection.ValidationResult
}{cache: make(map[string]*detection.ValidationResult)}

// Platform-specific validation rules
var PlatformRules = map[detection.PlatformType]ValidationRuleSet{
    detection.PlatformTypeSIEM: initSIEMRules(),
    detection.PlatformTypeEDR:  initEDRRules(),
    detection.PlatformTypeNSM:  initNSMRules(),
}

// Common validation rules applicable to all platforms
var CommonRules = initCommonRules()

// Quality thresholds for different platforms
var QualityThresholds = map[detection.PlatformType]QualityMetrics{
    detection.PlatformTypeSIEM: {Score: 0.99, PerformanceImpact: 0.3, FalsePositiveRate: 0.05},
    detection.PlatformTypeEDR:  {Score: 0.99, PerformanceImpact: 0.3, FalsePositiveRate: 0.05},
    detection.PlatformTypeNSM:  {Score: 0.99, PerformanceImpact: 0.3, FalsePositiveRate: 0.05},
}

// ValidateDetection performs comprehensive validation of a detection
func ValidateDetection(det *detection.Detection) (*detection.ValidationResult, error) {
    if det == nil {
        return nil, errors.New("detection cannot be nil")
    }

    // Check cache first
    cacheKey := getCacheKey(det)
    if result := getFromCache(cacheKey); result != nil {
        return result, nil
    }

    result := &detection.ValidationResult{
        DetectionID:       det.ID,
        PlatformType:      det.PlatformType,
        Issues:            make([]detection.ValidationIssue, 0),
        PlatformMetrics:   make(map[string]float64),
        ValidatedAt:       time.Now(),
    }

    // Apply common validation rules
    commonIssues := validateWithRuleSet(det, CommonRules)
    result.Issues = append(result.Issues, commonIssues...)

    // Apply platform-specific rules
    if platformRules, exists := PlatformRules[det.PlatformType]; exists {
        platformIssues := validateWithRuleSet(det, platformRules)
        result.Issues = append(result.Issues, platformIssues...)
    }

    // Calculate quality metrics
    metrics := calculateQualityMetrics(det, result.Issues)
    result.PerformanceImpact = getPerformanceImpactString(metrics.PerformanceImpact)
    result.FalsePositiveRate = metrics.FalsePositiveRate
    result.AccuracyScore = metrics.AccuracyScore

    // Cache the result
    cacheResult(cacheKey, result)

    return result, nil
}

// ValidateContent performs deep validation of detection content
func ValidateContent(content string, platform detection.PlatformType) ([]ValidationIssue, error) {
    if content == "" {
        return nil, errors.New("content cannot be empty")
    }

    issues := make([]ValidationIssue, 0)

    // Validate content format
    formatIssues := validateFormat(content, platform)
    issues = append(issues, formatIssues...)

    // Validate syntax
    syntaxIssues := validateSyntax(content, platform)
    issues = append(issues, syntaxIssues...)

    // Validate platform-specific constraints
    if platformRules, exists := PlatformRules[platform]; exists {
        platformIssues := validatePlatformContent(content, platformRules)
        issues = append(issues, platformIssues...)
    }

    return issues, nil
}

// Helper functions

func initCommonRules() ValidationRuleSet {
    return ValidationRuleSet{
        "required_fields": {
            Name:        "Required Fields Check",
            Description: "Validates presence of all required detection fields",
            Severity:    detection.SeverityError,
            Validate: func(det *detection.Detection) []ValidationIssue {
                var issues []ValidationIssue
                
                if det.Name == "" {
                    issues = append(issues, ValidationIssue{
                        Code:     "MISSING_NAME",
                        Message:  "Detection name is required",
                        Severity: detection.SeverityError,
                    })
                }
                
                if det.Description == "" {
                    issues = append(issues, ValidationIssue{
                        Code:     "MISSING_DESCRIPTION",
                        Message:  "Detection description is required",
                        Severity: detection.SeverityError,
                    })
                }
                
                return issues
            },
        },
        "content_format": {
            Name:        "Content Format Validation",
            Description: "Validates detection content format and structure",
            Severity:    detection.SeverityError,
            Validate: func(det *detection.Detection) []ValidationIssue {
                return validateFormat(det.Content, det.PlatformType)
            },
        },
    }
}

func validateWithRuleSet(det *detection.Detection, rules ValidationRuleSet) []detection.ValidationIssue {
    var issues []detection.ValidationIssue
    
    for _, rule := range rules {
        ruleIssues := rule.Validate(det)
        for _, issue := range ruleIssues {
            issues = append(issues, detection.ValidationIssue{
                Code:     issue.Code,
                Message:  issue.Message,
                Severity: issue.Severity,
            })
        }
    }
    
    return issues
}

func calculateQualityMetrics(det *detection.Detection, issues []detection.ValidationIssue) QualityMetrics {
    metrics := QualityMetrics{
        Score:             1.0,
        PerformanceImpact: 0.0,
        FalsePositiveRate: 0.0,
        AccuracyScore:     1.0,
    }

    // Reduce score based on issues
    for _, issue := range issues {
        switch issue.Severity {
        case detection.SeverityError:
            metrics.Score *= 0.5
        case detection.SeverityWarning:
            metrics.Score *= 0.8
        case detection.SeverityInfo:
            metrics.Score *= 0.95
        }
    }

    // Calculate performance impact
    metrics.PerformanceImpact = calculatePerformanceImpact(det)
    
    // Calculate false positive rate
    metrics.FalsePositiveRate = calculateFalsePositiveRate(det)
    
    // Calculate accuracy score
    metrics.AccuracyScore = calculateAccuracyScore(det, issues)

    return metrics
}

func getCacheKey(det *detection.Detection) string {
    return fmt.Sprintf("%s-%s-%s", det.ID.Hex(), det.Version, det.PlatformType)
}

func getFromCache(key string) *detection.ValidationResult {
    validationCache.RLock()
    defer validationCache.RUnlock()
    
    if result, exists := validationCache.cache[key]; exists {
        return result
    }
    return nil
}

func cacheResult(key string, result *detection.ValidationResult) {
    validationCache.Lock()
    defer validationCache.Unlock()
    
    validationCache.cache[key] = result
}

func getPerformanceImpactString(impact float64) string {
    switch {
    case impact <= 0.3:
        return "low"
    case impact <= 0.7:
        return "medium"
    default:
        return "high"
    }
}