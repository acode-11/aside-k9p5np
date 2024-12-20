"""
AI Service Configuration Settings

Provides comprehensive configuration management for the AI service including:
- Model parameters and thresholds
- API configurations
- Platform-specific settings
- Enhanced validation and security features
"""

import os
from typing import Dict, Optional, Union
from pydantic import BaseSettings, Field, validator
from pythonjsonlogger import jsonlogger
from cryptography.fernet import Fernet
from datetime import datetime

from ..shared.schemas.detection import DetectionSchema
from ..shared.proto.detection import PlatformType

class Settings(BaseSettings):
    """Enhanced configuration management for AI service with validation and security features."""
    
    # Environment Configuration
    environment: str = Field(
        default="development",
        env="AI_SERVICE_ENV",
        description="Deployment environment (development/staging/production)"
    )
    
    # Logging Configuration
    log_level: str = Field(
        default="INFO",
        env="AI_SERVICE_LOG_LEVEL",
        description="Logging level for the service"
    )
    
    # Model Settings with Performance Metrics
    model_settings: Dict = Field(
        default={
            "base_model": {
                "name": "gpt-4",
                "version": "latest",
                "temperature": 0.7,
                "max_tokens": 2048,
                "latency_threshold_ms": 500
            },
            "detection_head": {
                "name": "custom-transformer",
                "accuracy_threshold": 0.95,
                "batch_size": 32
            },
            "translation_model": {
                "name": "bert-base",
                "fidelity_threshold": 0.98,
                "max_sequence_length": 512
            },
            "optimization_engine": {
                "name": "rl-optimizer",
                "improvement_threshold": 0.25,
                "learning_rate": 0.001
            }
        },
        description="AI model configuration and performance thresholds"
    )
    
    # API Configuration with Security
    api_settings: Dict = Field(
        default={
            "openai": {
                "api_version": "2023-11-01",
                "timeout_seconds": 30,
                "max_retries": 3,
                "retry_delay": 1
            },
            "rate_limits": {
                "requests_per_minute": 60,
                "burst_limit": 100
            }
        },
        description="API configuration with rate limiting and security"
    )
    
    # Platform-Specific Settings
    platform_settings: Dict[str, Dict] = Field(
        default={
            "SIEM": {
                "accuracy_threshold": 0.99,
                "false_positive_threshold": 0.05,
                "performance_impact_threshold": "low",
                "validation_rules": "schema:siem_validation"
            },
            "EDR": {
                "accuracy_threshold": 0.99,
                "false_positive_threshold": 0.05,
                "performance_impact_threshold": "low",
                "validation_rules": "schema:edr_validation"
            },
            "NSM": {
                "accuracy_threshold": 0.99,
                "false_positive_threshold": 0.05,
                "performance_impact_threshold": "low",
                "validation_rules": "schema:nsm_validation"
            }
        },
        description="Platform-specific configuration and thresholds"
    )
    
    # Security Settings
    security_settings: Dict = Field(
        default={
            "encryption_key": None,  # Set via environment variable
            "token_expiry_minutes": 60,
            "min_password_length": 12,
            "require_mfa": True
        },
        description="Security-related configuration"
    )
    
    # Validation Rules
    validation_rules: Dict = Field(
        default={
            "quality_score_threshold": 0.95,
            "required_metadata_fields": [
                "mitre_tactics",
                "mitre_techniques",
                "severity"
            ],
            "max_content_size_kb": 100
        },
        description="Validation rules and thresholds"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True
        
    @validator("security_settings", pre=True)
    def load_security_settings(cls, v: Dict) -> Dict:
        """Load and validate security settings with encryption key."""
        v["encryption_key"] = os.getenv("AI_SERVICE_ENCRYPTION_KEY")
        if not v["encryption_key"]:
            raise ValueError("Encryption key must be provided via environment variable")
        return v

    def get_model_config(self, platform_type: PlatformType) -> Dict:
        """
        Returns validated model configuration for specified platform.
        
        Args:
            platform_type: Target platform type from PlatformType enum
            
        Returns:
            Dict containing validated platform-specific model configuration
        """
        if platform_type not in PlatformType.__members__:
            raise ValueError(f"Invalid platform type: {platform_type}")
            
        # Merge base model settings with platform-specific settings
        config = {
            **self.model_settings["base_model"],
            **self.platform_settings[platform_type.name]
        }
        
        # Apply platform-specific validation
        self._validate_platform_config(config, platform_type)
        
        return config

    def get_api_config(self) -> Dict:
        """
        Returns secure API configuration settings.
        
        Returns:
            Dict containing encrypted API configuration
        """
        config = self.api_settings.copy()
        
        # Encrypt sensitive values
        fernet = Fernet(self.security_settings["encryption_key"].encode())
        for key in ["api_key", "secret_key"]:
            if key in config:
                config[key] = fernet.encrypt(config[key].encode()).decode()
                
        return config

    def validate_configuration(self) -> bool:
        """
        Validates entire configuration against schemas.
        
        Returns:
            bool indicating validation success
        """
        try:
            # Validate model settings
            assert all(k in self.model_settings for k in [
                "base_model", "detection_head", "translation_model", "optimization_engine"
            ]), "Missing required model components"
            
            # Validate performance thresholds
            assert self.model_settings["base_model"]["latency_threshold_ms"] <= 500, \
                "Latency threshold exceeds maximum"
            assert self.model_settings["detection_head"]["accuracy_threshold"] >= 0.95, \
                "Accuracy threshold below minimum"
            assert self.model_settings["translation_model"]["fidelity_threshold"] >= 0.98, \
                "Fidelity threshold below minimum"
            
            # Validate platform settings
            for platform in PlatformType.__members__:
                if platform != "PLATFORM_TYPE_UNSPECIFIED":
                    assert platform in self.platform_settings, f"Missing settings for {platform}"
                    
            # Log validation success
            self._log_validation_result(True, "Configuration validation successful")
            return True
            
        except Exception as e:
            # Log validation failure
            self._log_validation_result(False, str(e))
            return False

    def _validate_platform_config(self, config: Dict, platform_type: PlatformType) -> None:
        """Validates platform-specific configuration."""
        platform_settings = self.platform_settings[platform_type.name]
        assert config["accuracy_threshold"] >= platform_settings["accuracy_threshold"], \
            f"Accuracy threshold below minimum for {platform_type.name}"
        assert config["performance_impact_threshold"] == platform_settings["performance_impact_threshold"], \
            f"Invalid performance impact threshold for {platform_type.name}"

    def _log_validation_result(self, success: bool, message: str) -> None:
        """Logs configuration validation results."""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "success": success,
            "message": message,
            "environment": self.environment
        }
        logger = jsonlogger.JsonLogger()
        logger.info(log_data)

# Global instance
settings = Settings()

# Export configuration constants
AI_SERVICE_CONFIG = {
    "model_settings": settings.model_settings,
    "api_settings": settings.api_settings,
    "platform_settings": settings.platform_settings,
    "validation_rules": settings.validation_rules
}