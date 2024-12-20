"""
AI Service Main Entry Point

Provides FastAPI application setup and endpoints for AI-powered detection content
generation, validation, and optimization with comprehensive monitoring and quality controls.
"""

import asyncio
from typing import Dict, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import structlog
import uvicorn
from prometheus_client import make_asgi_app

from .config.settings import Settings, get_model_config, get_api_config, validate_model_settings
from .services.openai_service import OpenAIService
from .models.detection_model import DetectionModel

# Initialize FastAPI application
app = FastAPI(
    title="AI Detection Service",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Configure logging
logger = structlog.get_logger(__name__)

# Initialize settings and services
settings = Settings(validate_on_init=True)
ai_service = OpenAIService(settings)
detection_model = DetectionModel(get_model_config(settings))

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DetectionRequest(BaseModel):
    """Request model for detection generation"""
    description: str = Field(..., min_length=10, max_length=2000)
    platform_type: str = Field(..., regex="^(SIEM|EDR|NSM)$")
    metadata: Dict = Field(...)
    quality_thresholds: Optional[Dict] = Field(default=None)
    performance_requirements: Optional[Dict] = Field(default=None)

class ValidationRequest(BaseModel):
    """Request model for detection validation"""
    content: str = Field(..., min_length=1, max_length=100000)
    platform_type: str = Field(..., regex="^(SIEM|EDR|NSM)$")
    validation_rules: Optional[Dict] = Field(default=None)

class OptimizationRequest(BaseModel):
    """Request model for detection optimization"""
    content: str = Field(..., min_length=1, max_length=100000)
    platform_type: str = Field(..., regex="^(SIEM|EDR|NSM)$")
    performance_metrics: Dict = Field(...)
    optimization_rules: Optional[Dict] = Field(default=None)

@app.on_event("startup")
async def startup_event():
    """Initialize service on startup"""
    try:
        # Validate model settings
        if not validate_model_settings(settings):
            raise ValueError("Invalid model configuration")

        # Initialize AI service components
        await ai_service.initialize()
        
        logger.info(
            "AI service started successfully",
            version=app.version,
            model_config=get_model_config(settings)
        )
    except Exception as e:
        logger.error(f"Startup failed: {str(e)}")
        raise

@app.middleware("http")
async def add_correlation_id(request: Request, call_next):
    """Add correlation ID to request context"""
    correlation_id = request.headers.get("X-Correlation-ID", str(uuid4()))
    structlog.contextvars.bind_contextvars(correlation_id=correlation_id)
    response = await call_next(request)
    response.headers["X-Correlation-ID"] = correlation_id
    return response

@app.post("/api/v1/detections/generate")
async def generate_detection(request: DetectionRequest):
    """
    Generate detection content with AI assistance
    
    Args:
        request: Detection generation request parameters
        
    Returns:
        Generated detection content with quality metrics
    """
    try:
        result = await ai_service.generate_detection_content(
            description=request.description,
            platform_type=request.platform_type,
            metadata=request.metadata,
            quality_thresholds=request.quality_thresholds
        )
        
        logger.info(
            "Detection generated successfully",
            platform_type=request.platform_type,
            quality_score=result.get("quality_metrics", {}).get("accuracy")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Detection generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/detections/validate")
async def validate_detection(request: ValidationRequest):
    """
    Validate detection content against platform requirements
    
    Args:
        request: Detection validation request parameters
        
    Returns:
        Validation results with quality metrics
    """
    try:
        result = await ai_service.validate_detection_content(
            content=request.content,
            platform_type=request.platform_type,
            validation_rules=request.validation_rules
        )
        
        logger.info(
            "Detection validated",
            platform_type=request.platform_type,
            is_valid=result.get("is_valid")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Detection validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/detections/optimize")
async def optimize_detection(request: OptimizationRequest):
    """
    Optimize detection content for performance
    
    Args:
        request: Detection optimization request parameters
        
    Returns:
        Optimized detection content with performance metrics
    """
    try:
        result = await ai_service.optimize_detection_content(
            content=request.content,
            platform_type=request.platform_type,
            performance_metrics=request.performance_metrics,
            optimization_rules=request.optimization_rules
        )
        
        logger.info(
            "Detection optimized",
            platform_type=request.platform_type,
            improvement=result.get("improvement")
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        logger.error(f"Detection optimization failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Verify AI service components
        model_status = await ai_service.check_model_status()
        if not model_status["healthy"]:
            raise ValueError("AI model unhealthy")
            
        return {
            "status": "healthy",
            "version": app.version,
            "model_status": model_status
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "error": str(e)}
        )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )