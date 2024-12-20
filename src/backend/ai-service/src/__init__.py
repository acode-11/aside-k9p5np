"""
AI Service Initialization Module

Configures and exposes core AI service components with enhanced monitoring,
security features, and performance optimization.

Version: 1.0.0
"""

import structlog
from typing import Dict, Optional
from functools import wraps
from prometheus_client import Counter, Histogram

from .config.settings import Settings
from .models.detection_model import DetectionModel
from .services.openai_service import OpenAIService, METRICS

# Initialize version
__version__ = "1.0.0"

# Configure structured logging with enhanced context
logger = structlog.get_logger(__name__)

# Initialize performance metrics
SERVICE_METRICS = {
    'initialization_time': Histogram(
        'ai_service_initialization_seconds',
        'AI service initialization time'
    ),
    'component_health': Counter(
        'ai_service_component_health',
        'AI service component health status',
        ['component', 'status']
    )
}

def performance_monitored(func):
    """Decorator for monitoring function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        with SERVICE_METRICS['initialization_time'].time():
            try:
                result = func(*args, **kwargs)
                SERVICE_METRICS['component_health'].labels(
                    component=func.__name__,
                    status='success'
                ).inc()
                return result
            except Exception as e:
                SERVICE_METRICS['component_health'].labels(
                    component=func.__name__,
                    status='error'
                ).inc()
                logger.error(
                    "Component initialization failed",
                    component=func.__name__,
                    error=str(e)
                )
                raise
    return wrapper

@performance_monitored
def configure_logging(log_level: Optional[str] = None) -> None:
    """
    Configures enhanced structured logging with performance metrics.
    
    Args:
        log_level: Optional log level override
    """
    # Get settings instance
    settings = Settings()
    
    # Configure structlog with enhanced processors
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.BoundLogger,
        cache_logger_on_first_use=True
    )
    
    # Set log level from settings or override
    log_level = log_level or settings.log_level
    structlog.configure(
        wrapper_class=structlog.make_filtering_bound_logger(log_level)
    )
    
    logger.info(
        "Logging configured",
        log_level=log_level,
        environment=settings.environment
    )

# Initialize core components with enhanced monitoring
try:
    # Initialize settings
    settings = Settings()
    
    # Initialize detection model
    detection_model = DetectionModel(settings.model_settings)
    
    # Initialize OpenAI service
    openai_service = OpenAIService(settings)
    
    # Configure logging
    configure_logging()
    
    logger.info(
        "AI service initialized successfully",
        version=__version__,
        environment=settings.environment
    )
    
except Exception as e:
    logger.error(
        "AI service initialization failed",
        error=str(e)
    )
    raise

# Export core components and configurations
__all__ = [
    'Settings',
    'DetectionModel',
    'OpenAIService',
    'METRICS',
    'SERVICE_METRICS',
    '__version__',
    'configure_logging'
]