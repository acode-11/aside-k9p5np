"""
Core search service implementation providing high-performance natural language search,
auto-complete suggestions, and index management with comprehensive error handling
and monitoring capabilities.

Version compatibility:
elasticsearch-dsl==8.11.0
grpcio==1.59.0
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from functools import wraps
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import RequestError, ConnectionTimeout
from elasticsearch_dsl import Search, Q
from prometheus_client import Counter, Histogram

from ..models.search_model import SearchQuery, SearchResult, DetectionDocument
from ..utils.query_builder import build_search_query
from ..config.elasticsearch import ElasticsearchSettings

# Configure logging
logger = logging.getLogger(__name__)

# Constants
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SEARCH_TIMEOUT = 1.5  # seconds
MAX_RETRIES = 3
CACHE_TTL = 300  # 5 minutes

# Metrics
SEARCH_REQUESTS = Counter('search_requests_total', 'Total search requests')
SEARCH_ERRORS = Counter('search_errors_total', 'Total search errors')
SEARCH_LATENCY = Histogram('search_latency_seconds', 'Search request latency')
CACHE_HITS = Counter('cache_hits_total', 'Total cache hits')

def error_handler(func):
    """Decorator for comprehensive error handling and logging."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except ConnectionTimeout as e:
            SEARCH_ERRORS.inc()
            logger.error(f"Search timeout error: {str(e)}")
            raise SearchServiceError("Search request timed out")
        except RequestError as e:
            SEARCH_ERRORS.inc()
            logger.error(f"Elasticsearch request error: {str(e)}")
            raise SearchServiceError("Invalid search request")
        except Exception as e:
            SEARCH_ERRORS.inc()
            logger.error(f"Unexpected error in search service: {str(e)}")
            raise SearchServiceError("Internal search service error")
    return wrapper

class SearchServiceError(Exception):
    """Custom exception for search service errors."""
    pass

class SearchService:
    """
    High-performance search service implementation with caching and monitoring.
    Provides natural language search, auto-complete, and index management capabilities.
    """

    def __init__(self, settings: ElasticsearchSettings):
        """
        Initialize search service with optimized Elasticsearch client and caching.

        Args:
            settings: ElasticsearchSettings configuration object
        """
        self._settings = settings
        self._client = Elasticsearch(**settings.get_client_config())
        self._cache = {}  # Simple in-memory cache
        
        # Verify connection and index
        if not self._settings.validate_connection():
            raise SearchServiceError("Failed to initialize Elasticsearch connection")
        
        logger.info("Search service initialized successfully")

    @error_handler
    @SEARCH_LATENCY.time()
    def search(self, query: SearchQuery) -> SearchResult:
        """
        Execute optimized search query with caching and monitoring.

        Args:
            query: SearchQuery object containing search parameters

        Returns:
            SearchResult: Enhanced search results with performance metrics
        """
        SEARCH_REQUESTS.inc()

        # Check cache
        cache_key = self._generate_cache_key(query)
        cached_result = self._get_from_cache(cache_key)
        if cached_result:
            CACHE_HITS.inc()
            return cached_result

        # Build and execute search
        search = build_search_query(query)
        response = search.using(self._client).index(self._settings.index_name).execute()

        # Process results
        hits = []
        for hit in response.hits:
            search_hit = DetectionDocument.from_detection(hit.to_dict()).to_search_hit()
            search_hit.score = hit.meta.score
            search_hit.highlights = hit.meta.highlight.to_dict() if hasattr(hit.meta, 'highlight') else {}
            hits.append(search_hit)

        # Build result with metrics
        result = SearchResult(
            hits=hits,
            total=response.hits.total.value,
            took_ms=response.took,
            max_score=response.hits.max_score or 0.0,
            aggregations=response.aggregations.to_dict() if hasattr(response, 'aggregations') else {},
            performance_metrics={
                'query_time_ms': response.took,
                'total_shards': response._shards.total,
                'successful_shards': response._shards.successful
            }
        )

        # Update cache
        self._add_to_cache(cache_key, result)

        return result

    @error_handler
    def get_suggestions(self, prefix: str, limit: Optional[int] = 10) -> List[str]:
        """
        Get real-time search suggestions with prefix matching.

        Args:
            prefix: Search prefix text
            limit: Maximum number of suggestions

        Returns:
            List[str]: Ranked list of search suggestions
        """
        if not prefix or len(prefix) < 2:
            return []

        # Build suggestion query
        suggest_query = {
            "suggestions": {
                "prefix": prefix,
                "completion": {
                    "field": "name.suggest",
                    "size": min(limit, 20),
                    "skip_duplicates": True,
                    "fuzzy": {
                        "fuzziness": "AUTO",
                        "min_length": 3
                    }
                }
            }
        }

        response = self._client.search(
            index=self._settings.index_name,
            suggest=suggest_query,
            _source=False
        )

        suggestions = []
        for suggestion in response['suggest']['suggestions'][0]['options']:
            suggestions.append(suggestion['text'])

        return suggestions

    @error_handler
    def refresh_index(self) -> bool:
        """
        Refresh search index with health verification.

        Returns:
            bool: Success status with health check
        """
        try:
            # Check index health
            health = self._client.cluster.health(index=self._settings.index_name)
            if health['status'] == 'red':
                logger.error("Index health is red, skipping refresh")
                return False

            # Perform refresh
            self._client.indices.refresh(index=self._settings.index_name)
            
            # Verify refresh
            stats = self._client.indices.stats(index=self._settings.index_name)
            logger.info(f"Index refreshed successfully: {stats['_all']['total']['docs']['count']} documents")
            
            return True

        except Exception as e:
            logger.error(f"Failed to refresh index: {str(e)}")
            return False

    @error_handler
    def index_detection(self, detection_data: Dict[str, Any]) -> bool:
        """
        Index detection with optimistic concurrency control.

        Args:
            detection_data: Detection data to index

        Returns:
            bool: Indexing success status
        """
        try:
            # Convert to document
            doc = DetectionDocument.from_detection(detection_data)
            
            # Index with optimistic concurrency control
            doc.meta.version_type = 'external'
            doc.meta.version = int(datetime.now().timestamp())
            
            # Save document
            doc.save(using=self._client, index=self._settings.index_name)
            
            # Clear related caches
            self._clear_related_caches(detection_data)
            
            return True

        except Exception as e:
            logger.error(f"Failed to index detection: {str(e)}")
            return False

    def _generate_cache_key(self, query: SearchQuery) -> str:
        """Generate unique cache key for search query."""
        return f"search:{hash(str(query.dict()))}"

    def _get_from_cache(self, key: str) -> Optional[SearchResult]:
        """Retrieve result from cache if valid."""
        cached = self._cache.get(key)
        if cached and (datetime.now() - cached['timestamp']).seconds < CACHE_TTL:
            return cached['result']
        return None

    def _add_to_cache(self, key: str, result: SearchResult):
        """Add result to cache with timestamp."""
        self._cache[key] = {
            'result': result,
            'timestamp': datetime.now()
        }

    def _clear_related_caches(self, detection_data: Dict[str, Any]):
        """Clear cache entries related to updated detection."""
        # Implementation would clear relevant cache entries
        self._cache.clear()  # Simple implementation - clear all