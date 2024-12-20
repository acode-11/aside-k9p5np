package platforms

import (
    "encoding/json"
    "fmt"
    "regexp"
    "strings"
    "sync"
    "time"

    "github.com/org/detection-platform/internal/models"
    pb "github.com/org/detection-platform/proto/translation"
    "go.uber.org/zap"
    "golang.org/x/sync/singleflight"
)

// SIEMTranslator handles translation of detections to SIEM-specific formats
type SIEMTranslator struct {
    // Platform-specific field mappings
    fieldMappings map[string]map[string]string
    // Syntax rules for different SIEM platforms
    syntaxRules map[string]map[string]string
    // Cache for translated content
    translationCache sync.Map
    // Deduplication of concurrent translations
    translationGroup singleflight.Group
    // Structured logger
    logger *zap.Logger
    // Quality analyzer for confidence scoring
    qualityAnalyzer *QualityAnalyzer
}

// QualityAnalyzer handles detection quality assessment
type QualityAnalyzer struct {
    validationRules map[string][]ValidationRule
    performanceThresholds map[string]float64
    logger *zap.Logger
}

// ValidationRule defines a platform-specific validation check
type ValidationRule struct {
    Name string
    Description string
    Severity pb.WarningLevel
    Validate func(string) (bool, string)
}

// NewSIEMTranslator creates a new SIEM translator instance
func NewSIEMTranslator(logger *zap.Logger) *SIEMTranslator {
    translator := &SIEMTranslator{
        fieldMappings: initializeFieldMappings(),
        syntaxRules: initializeSyntaxRules(),
        logger: logger,
        qualityAnalyzer: newQualityAnalyzer(logger),
    }
    return translator
}

// TranslateToSIEM converts UDF to a specific SIEM format with quality metrics
func (t *SIEMTranslator) TranslateToSIEM(detection *models.UniversalFormat, targetPlatform string, opts *models.ConversionOptions) (*pb.TranslationResponse, error) {
    cacheKey := fmt.Sprintf("%s:%s:%s", detection.ID, targetPlatform, detection.Version)
    
    // Check cache first
    if cached, ok := t.translationCache.Load(cacheKey); ok {
        return cached.(*pb.TranslationResponse), nil
    }

    // Deduplicate concurrent translations
    result, err, _ := t.translationGroup.Do(cacheKey, func() (interface{}, error) {
        return t.performTranslation(detection, targetPlatform, opts)
    })

    if err != nil {
        t.logger.Error("Translation failed",
            zap.String("detectionId", detection.ID),
            zap.String("platform", targetPlatform),
            zap.Error(err))
        return nil, err
    }

    response := result.(*pb.TranslationResponse)
    t.translationCache.Store(cacheKey, response)
    return response, nil
}

// performTranslation handles the actual translation logic
func (t *SIEMTranslator) performTranslation(detection *models.UniversalFormat, targetPlatform string, opts *models.ConversionOptions) (*pb.TranslationResponse, error) {
    startTime := time.Now()

    // Validate input
    if err := t.validateInput(detection, targetPlatform); err != nil {
        return nil, err
    }

    var translatedContent string
    var warnings []*pb.ValidationWarning
    var err error

    switch targetPlatform {
    case "splunk":
        translatedContent, warnings, err = t.toSplunkFormat(detection, opts)
    case "qradar":
        translatedContent, warnings, err = t.toQRadarFormat(detection, opts)
    default:
        return nil, fmt.Errorf("unsupported SIEM platform: %s", targetPlatform)
    }

    if err != nil {
        return nil, err
    }

    // Calculate quality metrics
    metrics := t.qualityAnalyzer.analyzeQuality(translatedContent, targetPlatform)
    
    response := &pb.TranslationResponse{
        DetectionId: detection.ID,
        TranslatedContent: translatedContent,
        ConfidenceScore: metrics.ConfidenceScore,
        Warnings: warnings,
        TranslatedAt: detection.AuditTrail.UpdatedAt.UTC(),
    }

    t.logger.Info("Translation completed",
        zap.String("detectionId", detection.ID),
        zap.String("platform", targetPlatform),
        zap.Float64("confidenceScore", metrics.ConfidenceScore),
        zap.Duration("duration", time.Since(startTime)))

    return response, nil
}

// toSplunkFormat converts detection to Splunk SPL format
func (t *SIEMTranslator) toSplunkFormat(detection *models.UniversalFormat, opts *models.ConversionOptions) (string, []*pb.ValidationWarning, error) {
    mappings := t.fieldMappings["splunk"]
    rules := t.syntaxRules["splunk"]
    
    // Apply field mappings
    content := detection.Content
    for udf, splunk := range mappings {
        content = strings.ReplaceAll(content, udf, splunk)
    }

    // Apply syntax rules
    for pattern, replacement := range rules {
        re := regexp.MustCompile(pattern)
        content = re.ReplaceAllString(content, replacement)
    }

    // Validate Splunk-specific syntax
    warnings := t.qualityAnalyzer.validateSplunkSyntax(content)

    // Add performance optimization comments
    if opts.PreserveComments {
        content = t.addOptimizationComments(content, "splunk")
    }

    return content, warnings, nil
}

// toQRadarFormat converts detection to QRadar format
func (t *SIEMTranslator) toQRadarFormat(detection *models.UniversalFormat, opts *models.ConversionOptions) (string, []*pb.ValidationWarning, error) {
    mappings := t.fieldMappings["qradar"]
    rules := t.syntaxRules["qradar"]
    
    // Apply field mappings
    content := detection.Content
    for udf, qradar := range mappings {
        content = strings.ReplaceAll(content, udf, qradar)
    }

    // Apply syntax rules
    for pattern, replacement := range rules {
        re := regexp.MustCompile(pattern)
        content = re.ReplaceAllString(content, replacement)
    }

    // Validate QRadar-specific syntax
    warnings := t.qualityAnalyzer.validateQRadarSyntax(content)

    // Add performance optimization comments
    if opts.PreserveComments {
        content = t.addOptimizationComments(content, "qradar")
    }

    return content, warnings, nil
}

// validateInput performs input validation
func (t *SIEMTranslator) validateInput(detection *models.UniversalFormat, targetPlatform string) error {
    if detection == nil {
        return fmt.Errorf("detection cannot be nil")
    }
    if detection.Content == "" {
        return fmt.Errorf("detection content cannot be empty")
    }
    if !isSupportedPlatform(targetPlatform) {
        return fmt.Errorf("unsupported platform: %s", targetPlatform)
    }
    return nil
}

// addOptimizationComments adds platform-specific optimization comments
func (t *SIEMTranslator) addOptimizationComments(content string, platform string) string {
    var optimizations []string
    switch platform {
    case "splunk":
        optimizations = []string{
            "| optimize lookups=true",
            "| stats count by _time span=1h",
        }
    case "qradar":
        optimizations = []string{
            "-- Optimize AQL query performance",
            "-- Use indexed fields where possible",
        }
    }
    
    return fmt.Sprintf("/* Performance Optimizations:\n%s\n*/\n%s",
        strings.Join(optimizations, "\n"),
        content)
}

// isSupportedPlatform checks if the platform is supported
func isSupportedPlatform(platform string) bool {
    supported := map[string]bool{
        "splunk": true,
        "qradar": true,
    }
    return supported[platform]
}

// initializeFieldMappings sets up platform-specific field mappings
func initializeFieldMappings() map[string]map[string]string {
    return map[string]map[string]string{
        "splunk": {
            "source_ip": "src_ip",
            "destination_ip": "dest_ip",
            "timestamp": "_time",
        },
        "qradar": {
            "source_ip": "sourceip",
            "destination_ip": "destinationip",
            "timestamp": "starttime",
        },
    }
}

// initializeSyntaxRules sets up platform-specific syntax rules
func initializeSyntaxRules() map[string]map[string]string {
    return map[string]map[string]string{
        "splunk": {
            `\bSELECT\b`: "search",
            `\bWHERE\b`: "|where",
        },
        "qradar": {
            `\bsearch\b`: "SELECT",
            `\|where\b`: "WHERE",
        },
    }
}