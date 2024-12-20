// Package config provides configuration management for the Detection Service
// with comprehensive validation and security features.
package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/kelseyhightower/envconfig" // v1.4.0
)

const (
	// DefaultMongoTimeout defines the default MongoDB operation timeout
	DefaultMongoTimeout = 10 * time.Second

	// DefaultGRPCPort defines the default gRPC server port
	DefaultGRPCPort = 50051

	// DefaultLogLevel defines the default logging level
	DefaultLogLevel = "info"

	// DefaultMongoPoolSize defines the default MongoDB connection pool size
	DefaultMongoPoolSize = 100

	// Minimum and maximum port ranges for validation
	minPort = 1024
	maxPort = 65535

	// Maximum timeout values for validation (in seconds)
	maxMongoTimeoutSeconds = 30
	maxGRPCTimeoutSeconds = 30
)

// Config represents the comprehensive configuration structure for the Detection Service
type Config struct {
	// Environment specifies the deployment environment (e.g., dev, staging, prod)
	Environment string `envconfig:"ENVIRONMENT" required:"true"`

	// MongoDB Configuration
	MongoURI      string        `envconfig:"MONGO_URI" required:"true"`
	MongoDatabase string        `envconfig:"MONGO_DATABASE" required:"true"`
	MongoPoolSize int           `envconfig:"MONGO_POOL_SIZE" default:"100"`
	MongoTimeout  time.Duration `envconfig:"MONGO_TIMEOUT"`
	MongoTLSEnabled bool        `envconfig:"MONGO_TLS_ENABLED" default:"true"`

	// gRPC Server Configuration
	GRPCHost           string        `envconfig:"GRPC_HOST" default:"0.0.0.0"`
	GRPCPort           int           `envconfig:"GRPC_PORT"`
	GRPCTimeout        time.Duration `envconfig:"GRPC_TIMEOUT"`
	GRPCMaxConnections int           `envconfig:"GRPC_MAX_CONNECTIONS" default:"1000"`

	// Logging Configuration
	LogLevel string `envconfig:"LOG_LEVEL"`

	// Tracing Configuration
	EnableTracing    bool    `envconfig:"ENABLE_TRACING" default:"false"`
	TracingEndpoint  string  `envconfig:"TRACING_ENDPOINT"`
	SamplingRate     float64 `envconfig:"SAMPLING_RATE" default:"0.1"`

	// Additional metadata tags
	Tags map[string]string `envconfig:"TAGS"`
}

// LoadConfig loads and validates service configuration from environment variables
func LoadConfig() (*Config, error) {
	cfg := &Config{
		MongoTimeout:  DefaultMongoTimeout,
		GRPCPort:     DefaultGRPCPort,
		LogLevel:     DefaultLogLevel,
		MongoPoolSize: DefaultMongoPoolSize,
		Tags:         make(map[string]string),
	}

	// Process environment variables with prefix "DETECTION"
	if err := envconfig.Process("DETECTION", cfg); err != nil {
		return nil, fmt.Errorf("failed to process environment config: %w", err)
	}

	// Validate the configuration
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("config validation failed: %w", err)
	}

	return cfg, nil
}

// Validate performs comprehensive validation of all configuration values
func (c *Config) Validate() error {
	// Validate Environment
	if !isValidEnvironment(c.Environment) {
		return fmt.Errorf("invalid environment: %s", c.Environment)
	}

	// Validate MongoDB URI
	if err := validateMongoURI(c.MongoURI); err != nil {
		return fmt.Errorf("invalid MongoDB URI: %w", err)
	}

	// Validate MongoDB database name
	if strings.TrimSpace(c.MongoDatabase) == "" {
		return fmt.Errorf("MongoDB database name cannot be empty")
	}

	// Validate MongoDB pool size
	if c.MongoPoolSize < 1 {
		return fmt.Errorf("MongoDB pool size must be greater than 0")
	}

	// Validate MongoDB timeout
	if c.MongoTimeout <= 0 || c.MongoTimeout > maxMongoTimeoutSeconds*time.Second {
		return fmt.Errorf("MongoDB timeout must be between 1 and %d seconds", maxMongoTimeoutSeconds)
	}

	// Validate gRPC port
	if c.GRPCPort < minPort || c.GRPCPort > maxPort {
		return fmt.Errorf("gRPC port must be between %d and %d", minPort, maxPort)
	}

	// Validate gRPC timeout
	if c.GRPCTimeout <= 0 || c.GRPCTimeout > maxGRPCTimeoutSeconds*time.Second {
		return fmt.Errorf("gRPC timeout must be between 1 and %d seconds", maxGRPCTimeoutSeconds)
	}

	// Validate log level
	if !isValidLogLevel(c.LogLevel) {
		return fmt.Errorf("invalid log level: %s", c.LogLevel)
	}

	// Validate tracing configuration if enabled
	if c.EnableTracing {
		if c.TracingEndpoint == "" {
			return fmt.Errorf("tracing endpoint required when tracing is enabled")
		}
		if c.SamplingRate < 0 || c.SamplingRate > 1 {
			return fmt.Errorf("sampling rate must be between 0 and 1")
		}
	}

	return nil
}

// GetMongoURI returns the MongoDB connection URI with sensitive information masked
func (c *Config) GetMongoURI() string {
	if c.MongoURI == "" {
		return ""
	}

	// Parse the MongoDB URI
	u, err := url.Parse(c.MongoURI)
	if err != nil {
		return "[invalid uri]"
	}

	// Mask password if present
	if u.User != nil {
		username := u.User.Username()
		u.User = url.UserPassword(username, "****")
	}

	return u.String()
}

// GetGRPCAddress returns the complete gRPC server address
func (c *Config) GetGRPCAddress() string {
	return fmt.Sprintf("%s:%d", c.GRPCHost, c.GRPCPort)
}

// Helper functions

func isValidEnvironment(env string) bool {
	validEnvs := map[string]bool{
		"dev":     true,
		"staging": true,
		"prod":    true,
	}
	return validEnvs[strings.ToLower(env)]
}

func isValidLogLevel(level string) bool {
	validLevels := map[string]bool{
		"debug": true,
		"info":  true,
		"warn":  true,
		"error": true,
	}
	return validLevels[strings.ToLower(level)]
}

func validateMongoURI(uri string) error {
	if uri == "" {
		return fmt.Errorf("MongoDB URI cannot be empty")
	}

	u, err := url.Parse(uri)
	if err != nil {
		return fmt.Errorf("invalid URI format: %w", err)
	}

	if u.Scheme != "mongodb" && u.Scheme != "mongodb+srv" {
		return fmt.Errorf("invalid MongoDB URI scheme: %s", u.Scheme)
	}

	if u.Host == "" {
		return fmt.Errorf("MongoDB URI must contain a host")
	}

	return nil
}