"""
AI Service Test Suite

Comprehensive test suite for validating AI service functionality including:
- Detection content generation with quality validation
- Platform-specific validation with false positive analysis
- Performance optimization with strict quality metrics
- Cross-platform compatibility testing
"""

import json
from typing import Dict, List
import pytest
import pytest_asyncio
from httpx import AsyncClient
from pytest_mock import MockFixture

from ..src.main import app
from ..src.services.openai_service import OpenAIService
from ..src.models.detection_model import DetectionModel

# Test data constants
TEST_DETECTION_CONTENT = {
    "SIEM": """
        search sourcetype=windows EventCode=4688
        | where CommandLine="*mimikatz*"
        | stats count by Computer, User, CommandLine
        | where count > 1
    """,
    "EDR": """
        process where commandline contains "mimikatz"
        and process_name != "legitimate_process.exe"
        group by hostname, username, commandline
        having count > 1
    """,
    "NSM": """
        alert tcp any any -> any any (
            msg:"Potential Mimikatz Usage";
            content:"mimikatz"; nocase;
            classtype:trojan-activity;
            sid:1000001; rev:1;
        )
    """
}

TEST_PLATFORM_TYPES = ["SIEM", "EDR", "NSM"]

TEST_PERFORMANCE_METRICS = {
    "cpu_impact": "low",
    "memory_impact": "low",
    "average_execution_time": 150,
    "false_positive_rate": 0.03
}

QUALITY_THRESHOLDS = {
    "accuracy": 0.99,
    "false_positive_rate": 0.05,
    "translation_accuracy": 0.99,
    "performance_impact": "low"
}

@pytest.mark.asyncio
class TestAIService:
    """Test class for AI service endpoints with comprehensive quality validation"""

    def setup_method(self):
        """Setup method with enhanced test isolation"""
        self.client = AsyncClient(app=app, base_url="http://test")
        self.test_detection = {
            "description": "Detect Mimikatz usage across platforms",
            "platform_type": "SIEM",
            "metadata": {
                "mitre_tactics": ["Credential Access"],
                "mitre_techniques": ["T1003"],
                "severity": "high",
                "data_sources": ["process_creation", "command_line"]
            },
            "quality_thresholds": QUALITY_THRESHOLDS
        }
        self.test_metrics = TEST_PERFORMANCE_METRICS.copy()
        self.platform_configs = {
            platform: {
                "accuracy_threshold": 0.99,
                "false_positive_threshold": 0.05,
                "performance_impact_threshold": "low"
            } for platform in TEST_PLATFORM_TYPES
        }

    def teardown_method(self):
        """Enhanced cleanup method with metric logging"""
        # Clean up test artifacts
        self.test_detection = None
        self.test_metrics = None
        self.platform_configs = None

    @pytest.mark.asyncio
    async def test_generate_detection_success(self, mocker: MockFixture):
        """Tests successful detection content generation with strict quality validation"""
        # Mock OpenAI service response
        mock_openai = mocker.patch.object(
            OpenAIService,
            'generate_detection_content',
            return_value={
                "content": TEST_DETECTION_CONTENT["SIEM"],
                "quality_metrics": {
                    "accuracy": 0.995,
                    "false_positive_rate": 0.03,
                    "translation_accuracy": 0.99
                },
                "validation_result": {
                    "is_valid": True,
                    "performance_impact": "low"
                }
            }
        )

        # Send generation request
        response = await self.client.post(
            "/api/v1/detections/generate",
            json=self.test_detection
        )

        # Verify response
        assert response.status_code == 200
        result = response.json()
        
        # Validate quality metrics
        assert result["quality_metrics"]["accuracy"] >= QUALITY_THRESHOLDS["accuracy"]
        assert result["quality_metrics"]["false_positive_rate"] <= QUALITY_THRESHOLDS["false_positive_rate"]
        assert result["quality_metrics"]["translation_accuracy"] >= QUALITY_THRESHOLDS["translation_accuracy"]
        
        # Verify performance impact
        assert result["validation_result"]["performance_impact"] == "low"
        
        # Verify content structure
        assert "content" in result
        assert len(result["content"]) > 0
        
        # Verify mock called correctly
        mock_openai.assert_called_once_with(
            description=self.test_detection["description"],
            platform_type=self.test_detection["platform_type"],
            metadata=self.test_detection["metadata"],
            quality_thresholds=self.test_detection["quality_thresholds"]
        )

    @pytest.mark.asyncio
    async def test_validate_detection_success(self, mocker: MockFixture):
        """Tests detection content validation with false positive analysis"""
        # Mock validation service
        mock_validate = mocker.patch.object(
            DetectionModel,
            'validate_detection',
            return_value={
                "is_valid": True,
                "syntax_valid": True,
                "structure_valid": True,
                "performance_impact": "low",
                "false_positive_rate": 0.03,
                "platform_compatibility": {
                    "is_compatible": True,
                    "score": 98
                }
            }
        )

        # Test validation request
        validation_request = {
            "content": TEST_DETECTION_CONTENT["SIEM"],
            "platform_type": "SIEM",
            "validation_rules": {
                "accuracy_threshold": 0.99,
                "false_positive_threshold": 0.05,
                "required_fields": ["EventCode", "CommandLine"]
            }
        }

        response = await self.client.post(
            "/api/v1/detections/validate",
            json=validation_request
        )

        # Verify response
        assert response.status_code == 200
        result = response.json()
        
        # Validate quality metrics
        assert result["is_valid"] is True
        assert result["false_positive_rate"] <= QUALITY_THRESHOLDS["false_positive_rate"]
        assert result["performance_impact"] == QUALITY_THRESHOLDS["performance_impact"]
        
        # Verify platform compatibility
        assert result["platform_compatibility"]["is_compatible"] is True
        assert result["platform_compatibility"]["score"] >= 95
        
        # Verify syntax and structure validation
        assert result["syntax_valid"] is True
        assert result["structure_valid"] is True
        
        # Verify mock called correctly
        mock_validate.assert_called_once()

    @pytest.mark.asyncio
    async def test_optimize_detection_success(self, mocker: MockFixture):
        """Tests detection content optimization with performance metrics"""
        # Mock optimization service
        mock_optimize = mocker.patch.object(
            DetectionModel,
            'optimize_detection',
            return_value={
                "content": TEST_DETECTION_CONTENT["SIEM"],
                "performance_metrics": {
                    "cpu_impact": "low",
                    "memory_impact": "low",
                    "average_execution_time": 120,
                    "false_positive_rate": 0.02
                },
                "improvement": {
                    "execution_time_reduction": 20,
                    "false_positive_reduction": 0.01
                }
            }
        )

        # Test optimization request
        optimization_request = {
            "content": TEST_DETECTION_CONTENT["SIEM"],
            "platform_type": "SIEM",
            "performance_metrics": TEST_PERFORMANCE_METRICS,
            "optimization_rules": {
                "target_execution_time": 100,
                "max_resource_impact": "low"
            }
        }

        response = await self.client.post(
            "/api/v1/detections/optimize",
            json=optimization_request
        )

        # Verify response
        assert response.status_code == 200
        result = response.json()
        
        # Validate performance improvements
        assert result["performance_metrics"]["cpu_impact"] == "low"
        assert result["performance_metrics"]["memory_impact"] == "low"
        assert result["performance_metrics"]["average_execution_time"] < TEST_PERFORMANCE_METRICS["average_execution_time"]
        assert result["performance_metrics"]["false_positive_rate"] < TEST_PERFORMANCE_METRICS["false_positive_rate"]
        
        # Verify optimization improvements
        assert result["improvement"]["execution_time_reduction"] > 0
        assert result["improvement"]["false_positive_reduction"] > 0
        
        # Verify content maintained quality
        assert "content" in result
        assert len(result["content"]) > 0
        
        # Verify mock called correctly
        mock_optimize.assert_called_once()