package platforms

import (
    "encoding/json"
    "fmt"
    "strings"
    "sync"

    "github.com/org/detection-platform/internal/models"
    pb "github.com/org/detection-platform/proto/translation"
)

// EDRPlatform represents supported EDR platforms
const (
    CrowdStrike    = "crowdstrike"
    SentinelOne    = "sentinelone"
    MicrosoftEDR   = "microsoft_defender"
)

// EDRTranslator provides enhanced translation capabilities for EDR platforms
type EDRTranslator struct {
    platformRules        map[string]map[string]interface{}
    syntaxPatterns      map[string]map[string]string
    versionCompatibility map[string]models.PlatformMetadata
    optimizationRules   map[string]map[string]interface{}
    performanceMetrics  map[string]float64
    mu                  sync.RWMutex
}

// NewEDRTranslator initializes a new EDR translator with comprehensive platform support
func NewEDRTranslator(config map[string]interface{}) (*EDRTranslator, error) {
    translator := &EDRTranslator{
        platformRules:        make(map[string]map[string]interface{}),
        syntaxPatterns:      make(map[string]map[string]string),
        versionCompatibility: make(map[string]models.PlatformMetadata),
        optimizationRules:   make(map[string]map[string]interface{}),
        performanceMetrics:  make(map[string]float64),
    }

    // Initialize platform-specific rules and patterns
    if err := translator.initializePlatformRules(); err != nil {
        return nil, fmt.Errorf("failed to initialize platform rules: %v", err)
    }

    return translator, nil
}

// ValidateEDRFormat validates detection content against EDR platform-specific rules
func (t *EDRTranslator) ValidateEDRFormat(content string, platform string, version string) ([]pb.ValidationWarning, error) {
    t.mu.RLock()
    platformMeta, exists := t.versionCompatibility[platform]
    t.mu.RUnlock()

    if !exists {
        return nil, fmt.Errorf("unsupported EDR platform: %s", platform)
    }

    // Version compatibility check
    if !isVersionCompatible(version, platformMeta.MinVersion, platformMeta.MaxVersion) {
        return nil, fmt.Errorf("incompatible platform version: %s (supported: %s-%s)", 
            version, platformMeta.MinVersion, platformMeta.MaxVersion)
    }

    var warnings []pb.ValidationWarning
    
    // Parse and validate content structure
    var detectionContent map[string]interface{}
    if err := json.Unmarshal([]byte(content), &detectionContent); err != nil {
        return nil, fmt.Errorf("invalid detection content format: %v", err)
    }

    // Validate platform-specific requirements
    platformWarnings, err := t.validatePlatformRequirements(detectionContent, platform, version)
    if err != nil {
        return nil, err
    }
    warnings = append(warnings, platformWarnings...)

    // Performance impact analysis
    perfWarnings := t.analyzePerformanceImpact(detectionContent, platform)
    warnings = append(warnings, perfWarnings...)

    // False positive analysis
    fpWarnings := t.analyzeFalsePositivePotential(detectionContent, platform)
    warnings = append(warnings, fpWarnings...)

    return warnings, nil
}

// ConvertToEDR converts Universal Detection Format to EDR platform-specific format
func (t *EDRTranslator) ConvertToEDR(detection models.UniversalFormat, targetPlatform string, version string) (string, float64, error) {
    // Validate input parameters
    if err := t.validateConversionInput(detection, targetPlatform, version); err != nil {
        return "", 0, err
    }

    // Apply platform-specific preprocessing
    processedContent, err := t.preprocessDetection(detection, targetPlatform)
    if err != nil {
        return "", 0, fmt.Errorf("preprocessing failed: %v", err)
    }

    // Transform to target platform format
    transformedContent, err := t.transformToEDRFormat(processedContent, targetPlatform, version)
    if err != nil {
        return "", 0, fmt.Errorf("transformation failed: %v", err)
    }

    // Apply platform-specific optimizations
    optimizedContent, err := t.applyOptimizations(transformedContent, targetPlatform)
    if err != nil {
        return "", 0, fmt.Errorf("optimization failed: %v", err)
    }

    // Calculate confidence score
    confidenceScore := t.calculateConfidenceScore(optimizedContent, targetPlatform)

    return optimizedContent, confidenceScore, nil
}

// Helper functions

func (t *EDRTranslator) initializePlatformRules() error {
    // Initialize CrowdStrike rules
    t.platformRules[CrowdStrike] = map[string]interface{}{
        "requiredFields": []string{"event_simpleName", "ComputerName", "CommandLine"},
        "syntaxVersion": "6.0",
        "optimizationLevel": 2,
    }

    // Initialize SentinelOne rules
    t.platformRules[SentinelOne] = map[string]interface{}{
        "requiredFields": []string{"eventType", "agentId", "processCmd"},
        "syntaxVersion": "4.0",
        "optimizationLevel": 2,
    }

    // Initialize Microsoft Defender rules
    t.platformRules[MicrosoftEDR] = map[string]interface{}{
        "requiredFields": []string{"ActionType", "DeviceName", "ProcessCommandLine"},
        "syntaxVersion": "2.0",
        "optimizationLevel": 2,
    }

    return nil
}

func (t *EDRTranslator) validatePlatformRequirements(content map[string]interface{}, platform string, version string) ([]pb.ValidationWarning, error) {
    t.mu.RLock()
    rules, exists := t.platformRules[platform]
    t.mu.RUnlock()

    if !exists {
        return nil, fmt.Errorf("platform rules not found: %s", platform)
    }

    var warnings []pb.ValidationWarning

    // Validate required fields
    requiredFields := rules["requiredFields"].([]string)
    for _, field := range requiredFields {
        if _, exists := content[field]; !exists {
            warnings = append(warnings, pb.ValidationWarning{
                Code:    "MISSING_REQUIRED_FIELD",
                Message: fmt.Sprintf("Required field missing: %s", field),
                Level:   pb.WarningLevel_WARNING_LEVEL_MAJOR,
            })
        }
    }

    return warnings, nil
}

func (t *EDRTranslator) analyzePerformanceImpact(content map[string]interface{}, platform string) []pb.ValidationWarning {
    var warnings []pb.ValidationWarning

    // Analyze query complexity
    complexity := t.calculateQueryComplexity(content)
    if complexity > 0.7 {
        warnings = append(warnings, pb.ValidationWarning{
            Code:    "HIGH_COMPLEXITY",
            Message: "Detection may have high performance impact",
            Level:   pb.WarningLevel_WARNING_LEVEL_MAJOR,
        })
    }

    return warnings
}

func (t *EDRTranslator) analyzeFalsePositivePotential(content map[string]interface{}, platform string) []pb.ValidationWarning {
    var warnings []pb.ValidationWarning

    // Analyze detection specificity
    specificity := t.calculateSpecificity(content)
    if specificity < 0.5 {
        warnings = append(warnings, pb.ValidationWarning{
            Code:    "LOW_SPECIFICITY",
            Message: "Detection may generate false positives",
            Level:   pb.WarningLevel_WARNING_LEVEL_MAJOR,
        })
    }

    return warnings
}

func (t *EDRTranslator) calculateQueryComplexity(content map[string]interface{}) float64 {
    // Implementation of complexity calculation
    return 0.5 // Placeholder
}

func (t *EDRTranslator) calculateSpecificity(content map[string]interface{}) float64 {
    // Implementation of specificity calculation
    return 0.8 // Placeholder
}

func isVersionCompatible(version, minVersion, maxVersion string) bool {
    // Implementation of version compatibility check
    return true // Placeholder
}

func (t *EDRTranslator) validateConversionInput(detection models.UniversalFormat, targetPlatform string, version string) error {
    if detection.Content == "" {
        return fmt.Errorf("empty detection content")
    }
    if targetPlatform == "" {
        return fmt.Errorf("target platform not specified")
    }
    return nil
}

func (t *EDRTranslator) preprocessDetection(detection models.UniversalFormat, targetPlatform string) (string, error) {
    // Implementation of detection preprocessing
    return detection.Content, nil
}

func (t *EDRTranslator) transformToEDRFormat(content string, targetPlatform string, version string) (string, error) {
    // Implementation of format transformation
    return content, nil
}

func (t *EDRTranslator) applyOptimizations(content string, targetPlatform string) (string, error) {
    // Implementation of platform-specific optimizations
    return content, nil
}

func (t *EDRTranslator) calculateConfidenceScore(content string, targetPlatform string) float64 {
    // Implementation of confidence score calculation
    return 0.95 // Placeholder
}