// Package config provides configuration management for the Translation Service
// with comprehensive platform support and enhanced security features.
package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3" // v3.0.1
	"github.com/org/detection-platform/proto/detection"
)

// Default configuration values
const (
	DefaultConfigPath        = "config/config.yaml"
	DefaultGRPCPort         = ":50053"
	DefaultMaxBatchSize     = 100
	DefaultMaxRetries       = 3
	DefaultValidationTimeout = 30 * time.Second
)

// Config represents the main service configuration with comprehensive platform support
type Config struct {
	GRPCPort      string                     `yaml:"grpcPort" json:"grpcPort"`
	MaxBatchSize  int                        `yaml:"maxBatchSize" json:"maxBatchSize"`
	PlatformConfigs map[string]PlatformConfig `yaml:"platformConfigs" json:"platformConfigs"`
	Logging       LogConfig                  `yaml:"logging" json:"logging"`
	Metrics       MetricsConfig              `yaml:"metrics" json:"metrics"`
	Security      SecurityConfig             `yaml:"security" json:"security"`
	RetryPolicy   RetryConfig               `yaml:"retryPolicy" json:"retryPolicy"`
}

// PlatformConfig contains platform-specific settings and validation rules
type PlatformConfig struct {
	Version        string                 `yaml:"version" json:"version"`
	APIEndpoint    string                 `yaml:"apiEndpoint" json:"apiEndpoint"`
	MaxContentSize int                    `yaml:"maxContentSize" json:"maxContentSize"`
	ValidationRules map[string]string     `yaml:"validationRules" json:"validationRules"`
	Options        map[string]interface{} `yaml:"options" json:"options"`
	Credentials    APICredentials         `yaml:"credentials" json:"credentials"`
	RetryPolicy    RetryConfig           `yaml:"retryPolicy" json:"retryPolicy"`
}

// LogConfig defines logging configuration
type LogConfig struct {
	Level      string `yaml:"level" json:"level"`
	Format     string `yaml:"format" json:"format"`
	OutputPath string `yaml:"outputPath" json:"outputPath"`
}

// MetricsConfig defines metrics and monitoring configuration
type MetricsConfig struct {
	Enabled     bool   `yaml:"enabled" json:"enabled"`
	Endpoint    string `yaml:"endpoint" json:"endpoint"`
	PushGateway string `yaml:"pushGateway" json:"pushGateway"`
}

// SecurityConfig defines security-related configuration
type SecurityConfig struct {
	TLSEnabled   bool   `yaml:"tlsEnabled" json:"tlsEnabled"`
	CertFile     string `yaml:"certFile" json:"certFile"`
	KeyFile      string `yaml:"keyFile" json:"keyFile"`
	MinTLSVersion string `yaml:"minTLSVersion" json:"minTLSVersion"`
}

// APICredentials contains platform-specific API credentials
type APICredentials struct {
	ClientID     string `yaml:"clientId" json:"clientId"`
	ClientSecret string `yaml:"clientSecret" json:"clientSecret"`
	TokenURL     string `yaml:"tokenUrl" json:"tokenUrl"`
}

// RetryConfig defines retry behavior for platform operations
type RetryConfig struct {
	MaxRetries      int           `yaml:"maxRetries" json:"maxRetries"`
	InitialInterval time.Duration `yaml:"initialInterval" json:"initialInterval"`
	MaxInterval     time.Duration `yaml:"maxInterval" json:"maxInterval"`
}

// LoadConfig loads and validates service configuration from file or environment
func LoadConfig(configPath string) (*Config, error) {
	if configPath == "" {
		configPath = DefaultConfigPath
	}

	// Verify file permissions and ownership
	if err := verifyFilePermissions(configPath); err != nil {
		return nil, fmt.Errorf("file permission verification failed: %w", err)
	}

	// Read configuration file with timeout
	data, err := readFileWithTimeout(configPath, 5*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config Config
	switch filepath.Ext(configPath) {
	case ".yaml", ".yml":
		if err := yaml.UnmarshalStrict(data, &config); err != nil {
			return nil, fmt.Errorf("failed to parse YAML config: %w", err)
		}
	case ".json":
		if err := json.Unmarshal(data, &config); err != nil {
			return nil, fmt.Errorf("failed to parse JSON config: %w", err)
		}
	default:
		return nil, fmt.Errorf("unsupported config file format: %s", filepath.Ext(configPath))
	}

	// Override with environment variables
	if err := loadEnvOverrides(&config); err != nil {
		return nil, fmt.Errorf("failed to load environment overrides: %w", err)
	}

	// Validate configuration
	if err := ValidateConfig(&config); err != nil {
		return nil, fmt.Errorf("configuration validation failed: %w", err)
	}

	return &config, nil
}

// ValidateConfig performs comprehensive validation of all configuration values
func ValidateConfig(config *Config) error {
	if config == nil {
		return fmt.Errorf("config cannot be nil")
	}

	// Validate basic service configuration
	if config.GRPCPort == "" {
		config.GRPCPort = DefaultGRPCPort
	}
	if config.MaxBatchSize <= 0 {
		config.MaxBatchSize = DefaultMaxBatchSize
	}

	// Validate platform configurations
	if len(config.PlatformConfigs) == 0 {
		return fmt.Errorf("at least one platform configuration is required")
	}

	// Validate each platform configuration
	for platform, platformConfig := range config.PlatformConfigs {
		if err := validatePlatformConfig(platform, platformConfig); err != nil {
			return fmt.Errorf("invalid platform config for %s: %w", platform, err)
		}
	}

	// Validate security configuration
	if config.Security.TLSEnabled {
		if err := validateTLSConfig(config.Security); err != nil {
			return fmt.Errorf("invalid TLS configuration: %w", err)
		}
	}

	return nil
}

// GetPlatformConfig retrieves and validates platform-specific configuration
func (c *Config) GetPlatformConfig(platform string) (PlatformConfig, error) {
	platformConfig, exists := c.PlatformConfigs[platform]
	if !exists {
		return PlatformConfig{}, fmt.Errorf("configuration not found for platform: %s", platform)
	}

	// Validate platform configuration before returning
	if err := validatePlatformConfig(platform, platformConfig); err != nil {
		return PlatformConfig{}, err
	}

	return platformConfig, nil
}

// Helper functions

func validatePlatformConfig(platform string, config PlatformConfig) error {
	if config.Version == "" {
		return fmt.Errorf("platform version is required")
	}
	if config.APIEndpoint == "" {
		return fmt.Errorf("API endpoint is required")
	}
	if config.MaxContentSize <= 0 {
		return fmt.Errorf("invalid max content size")
	}
	if len(config.ValidationRules) == 0 {
		return fmt.Errorf("at least one validation rule is required")
	}
	
	// Validate platform type
	switch platform {
	case detection.PlatformType_PLATFORM_TYPE_SIEM.String(),
		 detection.PlatformType_PLATFORM_TYPE_EDR.String(),
		 detection.PlatformType_PLATFORM_TYPE_NSM.String():
		// Valid platform type
	default:
		return fmt.Errorf("unsupported platform type: %s", platform)
	}

	return nil
}

func validateTLSConfig(config SecurityConfig) error {
	if config.CertFile == "" || config.KeyFile == "" {
		return fmt.Errorf("TLS certificate and key files are required when TLS is enabled")
	}
	if _, err := os.Stat(config.CertFile); err != nil {
		return fmt.Errorf("TLS certificate file not found: %w", err)
	}
	if _, err := os.Stat(config.KeyFile); err != nil {
		return fmt.Errorf("TLS key file not found: %w", err)
	}
	return nil
}

func verifyFilePermissions(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("failed to stat config file: %w", err)
	}

	mode := info.Mode()
	if mode.Perm()&0077 != 0 {
		return fmt.Errorf("config file has too permissive permissions: %v", mode.Perm())
	}

	return nil
}

func readFileWithTimeout(path string, timeout time.Duration) ([]byte, error) {
	done := make(chan []byte, 1)
	errChan := make(chan error, 1)

	go func() {
		data, err := os.ReadFile(path)
		if err != nil {
			errChan <- err
			return
		}
		done <- data
	}()

	select {
	case data := <-done:
		return data, nil
	case err := <-errChan:
		return nil, err
	case <-time.After(timeout):
		return nil, fmt.Errorf("timeout reading config file after %v", timeout)
	}
}

func loadEnvOverrides(config *Config) error {
	if port := os.Getenv("TRANSLATION_SERVICE_GRPC_PORT"); port != "" {
		config.GRPCPort = port
	}
	if batchSize := os.Getenv("TRANSLATION_SERVICE_MAX_BATCH_SIZE"); batchSize != "" {
		var size int
		if _, err := fmt.Sscanf(batchSize, "%d", &size); err == nil && size > 0 {
			config.MaxBatchSize = size
		}
	}
	return nil
}