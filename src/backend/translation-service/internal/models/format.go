package models

import (
    "encoding/json"
    "time"
    "github.com/org/detection-platform/proto/translation"
    "github.com/org/detection-platform/proto/detection"
)

// PlatformType represents supported security platforms
type PlatformType detection.v1.PlatformType

// QualityMetrics represents comprehensive quality measurements for a detection
type QualityMetrics struct {
    AccuracyScore      float64   `json:"accuracyScore"`      // 0-1 translation accuracy score
    FalsePositiveRate  float64   `json:"falsePositiveRate"`  // Estimated false positive rate
    PerformanceImpact  string    `json:"performanceImpact"`  // Low/Medium/High impact assessment
    ValidationWarnings []Warning `json:"validationWarnings"` // List of validation warnings
    ConfidenceScore    float64   `json:"confidenceScore"`    // Overall confidence in detection
    LastValidated      time.Time `json:"lastValidated"`      // Timestamp of last validation
}

// Warning represents a validation or translation warning
type Warning struct {
    Code    string                     `json:"code"`
    Message string                     `json:"message"`
    Level   translation.v1.WarningLevel `json:"level"`
}

// PlatformMetadata contains platform-specific configuration and requirements
type PlatformMetadata struct {
    MinVersion    string            `json:"minVersion"`    // Minimum supported platform version
    MaxVersion    string            `json:"maxVersion"`    // Maximum supported platform version
    Dependencies  []string          `json:"dependencies"`  // Required platform dependencies
    Capabilities  map[string]bool   `json:"capabilities"`  // Platform-specific feature support
    Optimizations map[string]string `json:"optimizations"` // Platform-specific optimizations
}

// AuditInfo tracks changes and validation history
type AuditInfo struct {
    CreatedAt    time.Time `json:"createdAt"`
    UpdatedAt    time.Time `json:"updatedAt"`
    CreatedBy    string    `json:"createdBy"`
    LastModified string    `json:"lastModified"`
    Version      string    `json:"version"`
    ChangeLog    []string  `json:"changeLog"`
}

// UniversalFormat represents the core Universal Detection Format (UDF) structure
type UniversalFormat struct {
    ID                  string           `json:"id"`
    Name                string           `json:"name"`
    Description         string           `json:"description"`
    Content            string           `json:"content"`
    Platform           PlatformType     `json:"platform"`
    Version            string           `json:"version"`
    PlatformSpecificData PlatformMetadata `json:"platformSpecificData"`
    Metrics            QualityMetrics   `json:"metrics"`
    Tags               []string         `json:"tags"`
    AuditTrail         AuditInfo        `json:"auditTrail"`
}

// ValidationOptions configures the validation process
type ValidationOptions struct {
    StrictMode          bool              `json:"strictMode"`
    QualityThreshold    float64           `json:"qualityThreshold"`
    PerformanceCheck    bool              `json:"performanceCheck"`
    SecurityCheck       bool              `json:"securityCheck"`
    PlatformConstraints PlatformMetadata  `json:"platformConstraints"`
}

// ConversionOptions configures the format conversion process
type ConversionOptions struct {
    OptimizationLevel   int               `json:"optimizationLevel"`
    PreserveComments    bool              `json:"preserveComments"`
    TargetVersion       string            `json:"targetVersion"`
    FeatureFlags        map[string]bool   `json:"featureFlags"`
}

// ValidationResult represents the comprehensive output of format validation
type ValidationResult struct {
    IsValid          bool           `json:"isValid"`
    QualityScore     float64        `json:"qualityScore"`
    Warnings         []Warning      `json:"warnings"`
    PerformanceScore float64        `json:"performanceScore"`
    SecurityScore    float64        `json:"securityScore"`
    Metadata         PlatformMetadata `json:"metadata"`
}

// ConversionResult represents the output of format conversion
type ConversionResult struct {
    Content          string         `json:"content"`
    SourceFormat     PlatformType   `json:"sourceFormat"`
    TargetFormat     PlatformType   `json:"targetFormat"`
    Metrics          QualityMetrics `json:"metrics"`
    Warnings         []Warning      `json:"warnings"`
    Metadata         PlatformMetadata `json:"metadata"`
}

// ToJSON converts UniversalFormat to JSON with enhanced metadata
func (u *UniversalFormat) ToJSON() ([]byte, error) {
    if err := u.validate(); err != nil {
        return nil, err
    }
    return json.Marshal(u)
}

// FromJSON creates UniversalFormat from JSON with validation
func (u *UniversalFormat) FromJSON(data []byte) error {
    if err := json.Unmarshal(data, u); err != nil {
        return err
    }
    return u.validate()
}

// validate performs comprehensive validation of the UniversalFormat
func (u *UniversalFormat) validate() error {
    // Implementation of validation logic
    return nil
}

// ValidateFormat validates detection content against platform-specific rules
func ValidateFormat(content string, platform PlatformType, options ValidationOptions) (ValidationResult, error) {
    // Implementation of format validation
    return ValidationResult{}, nil
}

// ConvertFormat converts detection content between platforms
func ConvertFormat(content string, sourcePlatform PlatformType, targetPlatform PlatformType, options ConversionOptions) (ConversionResult, error) {
    // Implementation of format conversion
    return ConversionResult{}, nil
}