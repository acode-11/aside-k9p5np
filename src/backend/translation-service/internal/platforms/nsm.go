package platforms

import (
    "encoding/json"
    "fmt"
    "regexp"
    "strings"
    "time"

    "github.com/org/detection-platform/proto/detection"
    "github.com/org/detection-platform/proto/translation"
    "../models"
)

// NSMPlatforms defines supported NSM platform types
const (
    PlatformZeek     = "zeek"
    PlatformSuricata = "suricata"
    PlatformSnort    = "snort"
)

// NSMRule represents an enhanced NSM rule structure with quality metrics
type NSMRule struct {
    Action     string            `json:"action"`
    Protocol   string            `json:"protocol"`
    SourceIP   string            `json:"sourceIP"`
    SourcePort string            `json:"sourcePort"`
    DestIP     string           `json:"destIP"`
    DestPort   string           `json:"destPort"`
    Options    map[string]string `json:"options"`
    Keywords   []string          `json:"keywords"`
    Metrics    models.QualityMetrics `json:"metrics"`
    Platform   string            `json:"platform"`
    State      ValidationState   `json:"state"`
}

// ValidationState tracks the validation status of an NSM rule
type ValidationState struct {
    IsValid           bool      `json:"isValid"`
    LastValidated     time.Time `json:"lastValidated"`
    ValidationErrors  []string  `json:"validationErrors"`
    OptimizationLevel int       `json:"optimizationLevel"`
}

// platformValidators contains platform-specific validation rules
var platformValidators = map[string][]regexp.Regexp{
    PlatformZeek: {
        *regexp.MustCompile(`^event\s+[\w_]+\s*\{`),
        *regexp.MustCompile(`^\s*NOTICE\s*\[\s*[\w_.]+\s*\]`),
    },
    PlatformSuricata: {
        *regexp.MustCompile(`^alert\s+(tcp|udp|ip|http|dns|tls|ssh)\s+`),
        *regexp.MustCompile(`msg:\s*"[^"]+";`),
    },
    PlatformSnort: {
        *regexp.MustCompile(`^(alert|log|pass|activate|dynamic|drop|reject|sdrop)`),
        *regexp.MustCompile(`\(\s*msg:\s*"[^"]+"\s*;\s*\)`),
    },
}

// ValidateNSMFormat performs enhanced validation of NSM detection content
func ValidateNSMFormat(content string, platform string) (*models.ValidationResult, error) {
    if !isValidPlatform(platform) {
        return nil, fmt.Errorf("unsupported NSM platform: %s", platform)
    }

    result := &models.ValidationResult{
        IsValid:          true,
        QualityScore:     100.0,
        Warnings:         make([]models.Warning, 0),
        PerformanceScore: 100.0,
        SecurityScore:    100.0,
        Metadata: models.PlatformMetadata{
            MinVersion:    getPlatformMinVersion(platform),
            Capabilities:  getPlatformCapabilities(platform),
            Optimizations: make(map[string]string),
        },
    }

    // Validate syntax against platform-specific rules
    if !validateSyntax(content, platform) {
        result.IsValid = false
        result.Warnings = append(result.Warnings, models.Warning{
            Code:    "INVALID_SYNTAX",
            Message: fmt.Sprintf("Invalid %s syntax detected", platform),
            Level:   translation.WarningLevel_WARNING_LEVEL_MAJOR,
        })
        result.QualityScore -= 50.0
    }

    // Check for known false positive patterns
    if fps := detectFalsePositives(content, platform); len(fps) > 0 {
        for _, fp := range fps {
            result.Warnings = append(result.Warnings, models.Warning{
                Code:    "POTENTIAL_FP",
                Message: fp,
                Level:   translation.WarningLevel_WARNING_LEVEL_MINOR,
            })
            result.QualityScore -= 10.0
        }
    }

    // Analyze performance impact
    perfImpact := analyzePerformanceImpact(content, platform)
    result.PerformanceScore = perfImpact.Score
    if perfImpact.Warning != "" {
        result.Warnings = append(result.Warnings, models.Warning{
            Code:    "PERFORMANCE_IMPACT",
            Message: perfImpact.Warning,
            Level:   translation.WarningLevel_WARNING_LEVEL_MINOR,
        })
    }

    return result, nil
}

// ConvertToNSM converts UDF detection content to NSM format
func ConvertToNSM(detection *models.UniversalFormat, platform string, options *models.ConversionOptions) (*models.ConversionResult, error) {
    if detection == nil {
        return nil, fmt.Errorf("nil detection provided")
    }

    // Validate platform support
    if !isValidPlatform(platform) {
        return nil, fmt.Errorf("unsupported NSM platform: %s", platform)
    }

    // Parse UDF content
    var nsmRule NSMRule
    if err := parseUDFContent(detection.Content, &nsmRule); err != nil {
        return nil, fmt.Errorf("failed to parse UDF content: %v", err)
    }

    // Apply platform-specific optimizations
    applyPlatformOptimizations(&nsmRule, platform, options)

    // Generate NSM rule content
    content, err := nsmRule.ToNSMString(platform)
    if err != nil {
        return nil, fmt.Errorf("failed to generate NSM content: %v", err)
    }

    // Validate generated content
    validationResult, err := ValidateNSMFormat(content, platform)
    if err != nil {
        return nil, fmt.Errorf("validation failed: %v", err)
    }

    return &models.ConversionResult{
        Content:      content,
        SourceFormat: detection.Platform,
        TargetFormat: detection.v1.PlatformType_PLATFORM_TYPE_NSM,
        Metrics:      nsmRule.Metrics,
        Warnings:     validationResult.Warnings,
        Metadata:     validationResult.Metadata,
    }, nil
}

// ToNSMString converts NSMRule to platform-specific string format
func (r *NSMRule) ToNSMString(platform string) (string, error) {
    switch platform {
    case PlatformZeek:
        return r.formatZeekRule(), nil
    case PlatformSuricata:
        return r.formatSuricataRule(), nil
    case PlatformSnort:
        return r.formatSnortRule(), nil
    default:
        return "", fmt.Errorf("unsupported platform: %s", platform)
    }
}

// Helper functions

func isValidPlatform(platform string) bool {
    return platform == PlatformZeek || 
           platform == PlatformSuricata || 
           platform == PlatformSnort
}

func validateSyntax(content string, platform string) bool {
    validators, exists := platformValidators[platform]
    if !exists {
        return false
    }

    for _, validator := range validators {
        if !validator.MatchString(content) {
            return false
        }
    }
    return true
}

type performanceImpact struct {
    Score   float64
    Warning string
}

func analyzePerformanceImpact(content string, platform string) performanceImpact {
    // Implementation of performance impact analysis
    return performanceImpact{
        Score:   95.0,
        Warning: "",
    }
}

func detectFalsePositives(content string, platform string) []string {
    // Implementation of false positive pattern detection
    return []string{}
}

func getPlatformMinVersion(platform string) string {
    versions := map[string]string{
        PlatformZeek:     "4.0.0",
        PlatformSuricata: "6.0.0",
        PlatformSnort:    "3.0.0",
    }
    return versions[platform]
}

func getPlatformCapabilities(platform string) map[string]bool {
    // Implementation of platform capability detection
    return map[string]bool{
        "regex_support":     true,
        "protocol_analysis": true,
        "custom_variables":  true,
    }
}

func parseUDFContent(content string, rule *NSMRule) error {
    // Implementation of UDF content parsing
    return nil
}

func applyPlatformOptimizations(rule *NSMRule, platform string, options *models.ConversionOptions) {
    // Implementation of platform-specific optimizations
}

func (r *NSMRule) formatZeekRule() string {
    // Implementation of Zeek rule formatting
    return ""
}

func (r *NSMRule) formatSuricataRule() string {
    // Implementation of Suricata rule formatting
    return ""
}

func (r *NSMRule) formatSnortRule() string {
    // Implementation of Snort rule formatting
    return ""
}