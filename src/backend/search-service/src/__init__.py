"""
Search service initialization module providing core configuration and exports.
Implements high-performance natural language search capabilities with comprehensive
logging and monitoring.

Version compatibility:
elasticsearch==8.11.0
elasticsearch-dsl==8.11.0
logging==3.11.0
"""

import logging
import logging.handlers
from typing import Dict, Any
import os
from datetime import datetime

from .config.elasticsearch import ElasticsearchSettings
from .services.search_service import SearchService

# Package version
__version__ = "1.0.0"

# Configure logging format with performance metrics
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s - %(performance_metrics)s"

# Initialize logger
logger = logging.getLogger(__name__)

def configure_logging() -> None:
    """
    Configure comprehensive logging settings for the search service with
    performance monitoring and rotation policies.
    """
    # Create logs directory if it doesn't exist
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Custom formatter with performance metrics
    class PerformanceFormatter(logging.Formatter):
        def format(self, record):
            if not hasattr(record, 'performance_metrics'):
                record.performance_metrics = {}
            
            # Add timestamp for performance tracking
            record.performance_metrics.update({
                'timestamp': datetime.utcnow().isoformat(),
                'process_time': getattr(record, 'process_time', 0)
            })
            
            return super().format(record)

    formatter = PerformanceFormatter(LOG_FORMAT)

    # Configure file handler with rotation
    file_handler = logging.handlers.RotatingFileHandler(
        filename=os.path.join(log_dir, 'search_service.log'),
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    # Configure console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.DEBUG if os.getenv('ENV') == 'development' else logging.INFO)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # Configure sensitive data masking
    class SensitiveDataFilter(logging.Filter):
        def filter(self, record):
            # Mask sensitive data patterns in log messages
            if hasattr(record, 'msg'):
                record.msg = self._mask_sensitive_data(record.msg)
            return True

        def _mask_sensitive_data(self, message: str) -> str:
            if isinstance(message, str):
                # Mask potential sensitive patterns (e.g., tokens, passwords)
                sensitive_patterns = {
                    r'password=[\w\-\.]+': 'password=*****',
                    r'token=[\w\-\.]+': 'token=*****',
                    r'api_key=[\w\-\.]+': 'api_key=*****'
                }
                masked_message = message
                for pattern, mask in sensitive_patterns.items():
                    masked_message = masked_message.replace(pattern, mask)
                return masked_message
            return message

    sensitive_filter = SensitiveDataFilter()
    for handler in root_logger.handlers:
        handler.addFilter(sensitive_filter)

    # Configure Elasticsearch client logging
    es_logger = logging.getLogger('elasticsearch')
    es_logger.setLevel(logging.WARNING)
    es_logger.addHandler(file_handler)

    logger.info(
        "Search service logging configured",
        extra={'performance_metrics': {'configuration': 'completed'}}
    )

# Initialize logging configuration
configure_logging()

# Initialize Elasticsearch settings
es_settings = ElasticsearchSettings()

try:
    # Validate Elasticsearch connection
    if not es_settings.validate_connection():
        raise RuntimeError("Failed to validate Elasticsearch connection")
    
    logger.info(
        "Elasticsearch connection validated successfully",
        extra={'performance_metrics': {'connection': 'validated'}}
    )

except Exception as e:
    logger.error(
        f"Failed to initialize search service: {str(e)}",
        extra={'performance_metrics': {'initialization': 'failed'}}
    )
    raise

# Export core components
__all__ = [
    'SearchService',
    'ElasticsearchSettings',
    '__version__'
]