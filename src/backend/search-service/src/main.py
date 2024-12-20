"""
Main entry point for the search service implementing a high-performance gRPC server
with Elasticsearch integration, health checks, metrics collection, and monitoring.

Version compatibility:
grpcio==1.59.0
pydantic-settings==2.0.3
prometheus-client==0.17.1
opentelemetry-api==1.20.0
"""

import logging
import argparse
import signal
import sys
from concurrent import futures
from typing import Dict, Any
import grpc
from pydantic_settings import BaseSettings
from prometheus_client import start_http_server, Counter, Histogram, Gauge
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode

from config.elasticsearch import ElasticsearchSettings
from services.search_service import SearchService

# Configure logging
logger = logging.getLogger(__name__)

# Constants
DEFAULT_PORT = 50051
DEFAULT_HOST = "0.0.0.0"
SHUTDOWN_TIMEOUT = 30
MAX_WORKERS = 10

class ServiceConfig(BaseSettings):
    """Enhanced service configuration with validation."""
    host: str = DEFAULT_HOST
    port: int = DEFAULT_PORT
    log_level: str = "INFO"
    worker_count: int = MAX_WORKERS
    shutdown_timeout: int = SHUTDOWN_TIMEOUT
    elasticsearch: ElasticsearchSettings
    tls_config: Dict[str, Any] = {}
    metrics_config: Dict[str, Any] = {
        "port": 9090,
        "path": "/metrics"
    }

    def validate_settings(self) -> bool:
        """Validate configuration dependencies and constraints."""
        try:
            # Validate port ranges
            if not (1024 <= self.port <= 65535):
                raise ValueError(f"Invalid port number: {self.port}")
            
            # Validate worker count
            if not (1 <= self.worker_count <= 50):
                raise ValueError(f"Invalid worker count: {self.worker_count}")
            
            # Validate Elasticsearch settings
            if not self.elasticsearch.validate_connection():
                raise ValueError("Failed to validate Elasticsearch connection")
            
            return True
        except Exception as e:
            logger.error(f"Configuration validation failed: {str(e)}")
            return False

def setup_logging(log_level: str, correlation_id: str = None) -> None:
    """Configure structured logging with correlation IDs."""
    log_format = (
        f"%(asctime)s - %(levelname)s - %(name)s "
        f"[%(correlation_id)s] %(message)s"
    ) if correlation_id else (
        "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
    )
    
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format=log_format,
        handlers=[logging.StreamHandler()]
    )
    
    # Configure external library logging
    logging.getLogger("elasticsearch").setLevel(logging.WARNING)
    logging.getLogger("grpc").setLevel(logging.WARNING)
    
    # Initialize OpenTelemetry tracer
    tracer_provider = trace.get_tracer_provider()
    tracer = tracer_provider.get_tracer(__name__)
    
    logger.info("Logging configured successfully")

def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments with validation."""
    parser = argparse.ArgumentParser(description="Search Service")
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help="Service host address"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help="Service port number"
    )
    parser.add_argument(
        "--log-level",
        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
        default="INFO",
        help="Logging level"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=MAX_WORKERS,
        help="Number of worker threads"
    )
    return parser.parse_args()

def initialize_metrics() -> Dict[str, Any]:
    """Initialize Prometheus metrics collectors."""
    metrics = {
        "search_latency": Histogram(
            "search_request_latency_seconds",
            "Search request latency in seconds",
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
        ),
        "request_counter": Counter(
            "search_requests_total",
            "Total number of search requests",
            ["method", "status"]
        ),
        "error_rate": Gauge(
            "search_error_rate",
            "Current error rate for search requests"
        ),
        "active_connections": Gauge(
            "search_active_connections",
            "Number of active search connections"
        )
    }
    
    logger.info("Metrics collectors initialized")
    return metrics

def main() -> None:
    """Enhanced main entry point with comprehensive service management."""
    try:
        # Parse arguments and initialize configuration
        args = parse_arguments()
        config = ServiceConfig()
        
        if not config.validate_settings():
            logger.error("Invalid service configuration")
            sys.exit(1)
        
        # Setup logging and monitoring
        setup_logging(args.log_level)
        metrics = initialize_metrics()
        
        # Start metrics HTTP server
        start_http_server(
            port=config.metrics_config["port"],
            addr=config.host
        )
        logger.info(f"Metrics server started on port {config.metrics_config['port']}")
        
        # Initialize search service
        search_service = SearchService(config.elasticsearch)
        logger.info("Search service initialized")
        
        # Create gRPC server with interceptors
        server = grpc.server(
            futures.ThreadPoolExecutor(max_workers=config.worker_count),
            options=[
                ("grpc.max_send_message_length", 100 * 1024 * 1024),
                ("grpc.max_receive_message_length", 100 * 1024 * 1024),
                ("grpc.keepalive_time_ms", 30000),
                ("grpc.keepalive_timeout_ms", 10000)
            ]
        )
        
        # Add service to server
        # Note: Service registration would be done here using the generated gRPC stubs
        # search_pb2_grpc.add_SearchServiceServicer_to_server(search_service, server)
        
        # Configure TLS if enabled
        if config.tls_config:
            credentials = grpc.ssl_server_credentials(
                ((config.tls_config["private_key"],
                  config.tls_config["certificate"]),)
            )
            server.add_secure_port(f"{config.host}:{config.port}", credentials)
        else:
            server.add_insecure_port(f"{config.host}:{config.port}")
        
        # Start server
        server.start()
        logger.info(f"Server started on {config.host}:{config.port}")
        
        # Setup graceful shutdown
        def handle_shutdown(signum, frame):
            logger.info("Initiating graceful shutdown...")
            
            # Stop accepting new requests
            server.stop(grace=config.shutdown_timeout)
            
            # Cleanup resources
            metrics["active_connections"].set(0)
            sys.exit(0)
        
        signal.signal(signal.SIGTERM, handle_shutdown)
        signal.signal(signal.SIGINT, handle_shutdown)
        
        # Keep server running
        server.wait_for_termination()
        
    except Exception as e:
        logger.error(f"Fatal error in main: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()