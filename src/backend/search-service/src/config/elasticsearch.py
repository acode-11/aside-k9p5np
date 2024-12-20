"""
Elasticsearch configuration module for the search service.
Provides comprehensive settings management and client setup with enhanced security,
monitoring, and performance features.

Version compatibility:
pydantic==2.4.2
elasticsearch==8.11.0
elasticsearch_dsl==8.11.0
"""

import logging
from typing import Dict, Any, Optional
from pydantic import dataclass, Field, validator
from elasticsearch import Elasticsearch
from elasticsearch_dsl import Index, analyzer

# Configure logging
logger = logging.getLogger(__name__)

# Default configuration constants
DEFAULT_INDEX_NAME = "detections"
DEFAULT_SHARDS = 3
DEFAULT_REPLICAS = 2
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_RETRY_ON_TIMEOUT = True
DEFAULT_MAX_RETRIES = 3
DEFAULT_REFRESH_INTERVAL = "1s"

@dataclass
class ElasticsearchSettings:
    """
    Enhanced configuration class for Elasticsearch connection and index settings.
    Provides comprehensive configuration options for high availability, monitoring,
    and performance optimization.
    """
    
    # Core settings
    hosts: str = Field(..., description="Elasticsearch hosts configuration")
    index_name: str = Field(DEFAULT_INDEX_NAME, description="Name of the primary index")
    number_of_shards: int = Field(DEFAULT_SHARDS, description="Number of primary shards")
    number_of_replicas: int = Field(DEFAULT_REPLICAS, description="Number of replica shards")
    
    # Authentication settings
    username: Optional[str] = Field(None, description="Elasticsearch username")
    password: Optional[str] = Field(None, description="Elasticsearch password")
    use_ssl: bool = Field(True, description="Enable SSL/TLS connection")
    
    # Performance settings
    timeout_seconds: int = Field(DEFAULT_TIMEOUT_SECONDS, description="Connection timeout in seconds")
    max_retries: int = Field(DEFAULT_MAX_RETRIES, description="Maximum number of retry attempts")
    retry_on_timeout: bool = Field(DEFAULT_RETRY_ON_TIMEOUT, description="Retry on timeout")
    refresh_interval: str = Field(DEFAULT_REFRESH_INTERVAL, description="Index refresh interval")
    
    # Advanced configuration
    ssl_config: Dict[str, Any] = Field(default_factory=dict, description="SSL configuration options")
    connection_pool_config: Dict[str, Any] = Field(default_factory=dict, description="Connection pool settings")
    monitoring_config: Dict[str, Any] = Field(default_factory=dict, description="Monitoring configuration")

    @validator("hosts")
    def validate_hosts(cls, v: str) -> str:
        """Validate hosts configuration format."""
        if not v:
            raise ValueError("Elasticsearch hosts configuration is required")
        return v

    def get_client_config(self) -> Dict[str, Any]:
        """
        Generate comprehensive Elasticsearch client configuration dictionary.
        
        Returns:
            Dict[str, Any]: Complete client configuration dictionary
        """
        config = {
            "hosts": self.hosts.split(","),
            "timeout": self.timeout_seconds,
            "retry_on_timeout": self.retry_on_timeout,
            "max_retries": self.max_retries
        }

        # Authentication configuration
        if self.username and self.password:
            config.update({
                "basic_auth": (self.username, self.password)
            })

        # SSL configuration
        if self.use_ssl:
            ssl_config = {
                "verify_certs": True,
                "use_ssl": True
            }
            ssl_config.update(self.ssl_config)
            config.update({"ssl": ssl_config})

        # Connection pool configuration
        if self.connection_pool_config:
            config.update({
                "connection_class": "requests",
                "pool_options": self.connection_pool_config
            })

        # Monitoring configuration
        if self.monitoring_config:
            config.update({
                "apm_config": self.monitoring_config
            })

        logger.debug("Generated Elasticsearch client configuration")
        return config

    def get_index_settings(self) -> Dict[str, Any]:
        """
        Generate comprehensive Elasticsearch index settings.
        
        Returns:
            Dict[str, Any]: Complete index configuration settings
        """
        settings = {
            "settings": {
                "number_of_shards": self.number_of_shards,
                "number_of_replicas": self.number_of_replicas,
                "refresh_interval": self.refresh_interval,
                "analysis": {
                    "analyzer": {
                        "detection_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": ["lowercase", "stop", "snowball"]
                        }
                    }
                },
                "index": {
                    "query": {
                        "default_field": ["content", "title", "description"]
                    },
                    "mapping": {
                        "total_fields": {
                            "limit": 2000
                        }
                    },
                    "max_result_window": 10000
                }
            },
            "mappings": {
                "properties": {
                    "content": {
                        "type": "text",
                        "analyzer": "detection_analyzer"
                    },
                    "title": {
                        "type": "text",
                        "analyzer": "detection_analyzer",
                        "fields": {
                            "keyword": {
                                "type": "keyword"
                            }
                        }
                    },
                    "description": {
                        "type": "text",
                        "analyzer": "detection_analyzer"
                    },
                    "created_at": {
                        "type": "date"
                    },
                    "updated_at": {
                        "type": "date"
                    },
                    "platform": {
                        "type": "keyword"
                    },
                    "tags": {
                        "type": "keyword"
                    }
                }
            }
        }

        logger.debug("Generated Elasticsearch index settings")
        return settings

    def validate_connection(self) -> bool:
        """
        Validate Elasticsearch connection and settings.
        
        Returns:
            bool: Connection validation result
        """
        try:
            client = Elasticsearch(**self.get_client_config())
            
            # Check cluster health
            health = client.cluster.health()
            if health["status"] in ["red"]:
                logger.error("Cluster health is red")
                return False

            # Validate index
            index = Index(self.index_name, using=client)
            if not index.exists():
                logger.info(f"Creating index {self.index_name}")
                index.create(body=self.get_index_settings())
            
            # Test search functionality
            client.search(index=self.index_name, query={"match_all": {}}, size=1)
            
            logger.info("Elasticsearch connection validated successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to validate Elasticsearch connection: {str(e)}")
            return False