// Package models implements core domain models for the detection service
package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/bson/validation"

	detection "../../shared/proto/detection" // v1.0.0
)

// PlatformType represents supported security platforms
type PlatformType string

// Platform type constants
const (
	PlatformTypeSIEM PlatformType = "SIEM"
	PlatformTypeEDR  PlatformType = "EDR"
	PlatformTypeNSM  PlatformType = "NSM"
)

// SeverityLevel represents validation issue severity
type SeverityLevel string

// Severity level constants
const (
	SeverityInfo    SeverityLevel = "INFO"
	SeverityWarning SeverityLevel = "WARNING"
	SeverityError   SeverityLevel = "ERROR"
)

// Quality thresholds and constants
const (
	QualityThreshold     float64 = 0.99 // 99% quality threshold
	MaxFalsePositiveRate float64 = 0.05 // 5% maximum false positive rate
)

// Detection represents the core domain model for security detections
type Detection struct {
	ID                 primitive.ObjectID              `bson:"_id,omitempty" json:"id"`
	Name               string                          `bson:"name" json:"name" validate:"required,min=3,max=200"`
	Description        string                          `bson:"description" json:"description" validate:"required,min=10"`
	Content            string                          `bson:"content" json:"content" validate:"required"`
	PlatformType       PlatformType                   `bson:"platform_type" json:"platform_type" validate:"required"`
	Version            string                          `bson:"version" json:"version" validate:"required,semver"`
	Owner              User                            `bson:"owner" json:"owner" validate:"required"`
	Metadata           map[string]string              `bson:"metadata" json:"metadata"`
	QualityScore       float64                        `bson:"quality_score" json:"quality_score"`
	Tags               []string                        `bson:"tags" json:"tags"`
	CreatedAt          time.Time                      `bson:"created_at" json:"created_at"`
	UpdatedAt          time.Time                      `bson:"updated_at" json:"updated_at"`
	PlatformValidations map[PlatformType]ValidationResult `bson:"platform_validations" json:"platform_validations"`
}

// User represents detection ownership information
type User struct {
	ID       string `bson:"id" json:"id" validate:"required"`
	Username string `bson:"username" json:"username" validate:"required"`
	Email    string `bson:"email" json:"email" validate:"required,email"`
}

// ValidationResult represents comprehensive validation output
type ValidationResult struct {
	DetectionID       primitive.ObjectID       `bson:"detection_id" json:"detection_id"`
	PlatformType      PlatformType            `bson:"platform_type" json:"platform_type"`
	Issues            []ValidationIssue        `bson:"issues" json:"issues"`
	PerformanceImpact string                  `bson:"performance_impact" json:"performance_impact"`
	FalsePositiveRate float64                 `bson:"false_positive_rate" json:"false_positive_rate"`
	AccuracyScore     float64                 `bson:"accuracy_score" json:"accuracy_score"`
	PlatformMetrics   map[string]float64      `bson:"platform_metrics" json:"platform_metrics"`
	ValidatedAt       time.Time               `bson:"validated_at" json:"validated_at"`
}

// ValidationIssue represents a specific validation problem
type ValidationIssue struct {
	Code     string        `bson:"code" json:"code"`
	Message  string        `bson:"message" json:"message"`
	Severity SeverityLevel `bson:"severity" json:"severity"`
}

// ValidateForPlatform validates detection content for a specific platform
func (d *Detection) ValidateForPlatform(platform PlatformType) (*ValidationResult, error) {
	result, err := ValidateContent(d.Content, platform)
	if err != nil {
		return nil, err
	}

	// Update detection's platform validations
	d.PlatformValidations[platform] = *result

	// Recalculate quality score
	d.QualityScore = CalculateQualityScore(result)

	return result, nil
}

// ValidateContent performs comprehensive content validation
func ValidateContent(content string, platform PlatformType) (*ValidationResult, error) {
	result := &ValidationResult{
		PlatformType:    platform,
		Issues:          make([]ValidationIssue, 0),
		PlatformMetrics: make(map[string]float64),
		ValidatedAt:     time.Now(),
	}

	// Validate content format and structure
	if err := validateFormat(content, platform); err != nil {
		result.Issues = append(result.Issues, ValidationIssue{
			Code:     "INVALID_FORMAT",
			Message:  err.Error(),
			Severity: SeverityError,
		})
	}

	// Validate platform-specific rules
	platformIssues := validatePlatformRules(content, platform)
	result.Issues = append(result.Issues, platformIssues...)

	// Assess performance impact
	result.PerformanceImpact = assessPerformanceImpact(content, platform)
	
	// Calculate false positive rate
	result.FalsePositiveRate = calculateFalsePositiveRate(content, platform)

	// Calculate accuracy score
	result.AccuracyScore = calculateAccuracyScore(result.Issues)

	return result, nil
}

// CalculateQualityScore calculates the overall quality score
func CalculateQualityScore(result *ValidationResult) float64 {
	// Base score from accuracy
	score := result.AccuracyScore * 0.4

	// Performance impact weight
	perfScore := getPerformanceScore(result.PerformanceImpact)
	score += perfScore * 0.3

	// False positive rate weight
	fpScore := 1.0 - (result.FalsePositiveRate / MaxFalsePositiveRate)
	score += fpScore * 0.3

	// Normalize score between 0 and 1
	if score > 1.0 {
		score = 1.0
	} else if score < 0.0 {
		score = 0.0
	}

	return score
}

// Helper functions

func validateFormat(content string, platform PlatformType) error {
	// Implementation would include format validation logic
	return nil
}

func validatePlatformRules(content string, platform PlatformType) []ValidationIssue {
	// Implementation would include platform-specific validation rules
	return []ValidationIssue{}
}

func assessPerformanceImpact(content string, platform PlatformType) string {
	// Implementation would include performance impact assessment
	return "low"
}

func calculateFalsePositiveRate(content string, platform PlatformType) float64 {
	// Implementation would include false positive rate calculation
	return 0.01
}

func calculateAccuracyScore(issues []ValidationIssue) float64 {
	// Implementation would include accuracy score calculation
	return 0.99
}

func getPerformanceScore(impact string) float64 {
	switch impact {
	case "low":
		return 1.0
	case "medium":
		return 0.7
	case "high":
		return 0.4
	default:
		return 0.0
	}
}

// ToProto converts the domain model to protobuf message
func (d *Detection) ToProto() *detection.Detection {
	return &detection.Detection{
		Id:          d.ID.Hex(),
		Name:        d.Name,
		Description: d.Description,
		Content:     d.Content,
		PlatformType: detection.PlatformType(detection.PlatformType_value[string(d.PlatformType)]),
		Version:     d.Version,
		Owner: &detection.User{
			Id:       d.Owner.ID,
			Username: d.Owner.Username,
			Email:    d.Owner.Email,
		},
		Metadata:     d.Metadata,
		QualityScore: d.QualityScore,
		Tags:        d.Tags,
		CreatedAt:   nil, // Would need timestamp conversion
		UpdatedAt:   nil, // Would need timestamp conversion
	}
}

// FromProto converts protobuf message to domain model
func (d *Detection) FromProto(proto *detection.Detection) error {
	var err error
	d.ID, err = primitive.ObjectIDFromHex(proto.Id)
	if err != nil {
		return err
	}

	d.Name = proto.Name
	d.Description = proto.Description
	d.Content = proto.Content
	d.PlatformType = PlatformType(proto.PlatformType.String())
	d.Version = proto.Version
	d.Owner = User{
		ID:       proto.Owner.Id,
		Username: proto.Owner.Username,
		Email:    proto.Owner.Email,
	}
	d.Metadata = proto.Metadata
	d.QualityScore = proto.QualityScore
	d.Tags = proto.Tags
	// Would need timestamp conversion for CreatedAt and UpdatedAt

	return nil
}