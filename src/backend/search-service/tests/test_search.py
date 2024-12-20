"""
Comprehensive test suite for the search service functionality.
Covers natural language search, performance verification, and content discovery features.

Version compatibility:
pytest==7.4.3
pytest-asyncio==0.21.1
elasticsearch-dsl==8.11.0
unittest.mock==3.11.0
"""

import json
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any
from unittest.mock import Mock, patch
from elasticsearch_dsl import Search, Q

from ..src.services.search_service import SearchService, SearchServiceError
from ..src.models.search_model import SearchQuery, SearchResult
from ..src.config.elasticsearch import ElasticsearchSettings

# Test constants
TEST_INDEX = "test_detections"
TEST_TIMEOUT = "2s"
PERFORMANCE_THRESHOLD_MS = 2000  # 2 second SLA requirement

@pytest.fixture(scope="module")
async def setup_module():
    """Initialize test environment and load test data."""
    # Configure test settings
    settings = ElasticsearchSettings(
        hosts="localhost:9200",
        index_name=TEST_INDEX,
        number_of_shards=1,
        number_of_replicas=0,
        timeout_seconds=5
    )

    # Load test data
    with open("tests/fixtures/test_data.json", "r") as f:
        test_data = json.load(f)

    # Initialize test client and create index
    client = settings.get_client_config()
    index_settings = settings.get_index_settings()
    
    yield {
        "settings": settings,
        "test_data": test_data,
        "client_config": client,
        "index_settings": index_settings
    }

    # Cleanup
    try:
        client = settings.get_client_config()
        es = client.indices.delete(index=TEST_INDEX, ignore=[404])
    except Exception as e:
        pytest.fail(f"Failed to cleanup test environment: {str(e)}")

@pytest.mark.asyncio
class TestSearchService:
    """
    Comprehensive test suite for SearchService functionality.
    Tests natural language search, filtering, suggestions, and performance.
    """

    def setup_method(self):
        """Initialize test instance with mocked dependencies."""
        self.settings = ElasticsearchSettings(
            hosts="localhost:9200",
            index_name=TEST_INDEX
        )
        self.service = SearchService(self.settings)
        self.performance_metrics = []

    async def test_search_basic(self):
        """
        Test basic natural language search functionality.
        Verifies result accuracy and response format.
        """
        # Prepare test query
        query = SearchQuery(
            query_text="ransomware detection windows",
            page_size=10,
            page_number=1
        )

        # Execute search
        start_time = datetime.now()
        result = await self.service.search(query)
        duration_ms = (datetime.now() - start_time).total_seconds() * 1000

        # Verify response time SLA
        assert duration_ms < PERFORMANCE_THRESHOLD_MS, f"Search exceeded SLA: {duration_ms}ms"

        # Verify result structure
        assert isinstance(result, SearchResult)
        assert len(result.hits) > 0
        assert result.total > 0
        assert result.took_ms > 0
        assert result.max_score > 0

        # Verify result content
        first_hit = result.hits[0]
        assert first_hit.id
        assert first_hit.name
        assert first_hit.description
        assert first_hit.platform_type in ["SIEM", "EDR", "NSM"]
        assert first_hit.score > 0

    async def test_search_with_filters(self):
        """
        Test search with platform and tag filters.
        Verifies filter application and result accuracy.
        """
        # Prepare filtered query
        query = SearchQuery(
            query_text="lateral movement detection",
            platforms=["EDR"],
            tags=["windows", "threat-hunting"],
            min_quality_score=0.8,
            page_size=20,
            page_number=1
        )

        # Execute filtered search
        result = await self.service.search(query)

        # Verify filter application
        assert result.total > 0
        for hit in result.hits:
            assert hit.platform_type == "EDR"
            assert any(tag in hit.tags for tag in query.tags)
            assert hit.quality_score >= 0.8

        # Verify aggregations
        assert "platforms" in result.aggregations
        assert "tags" in result.aggregations

    async def test_search_suggestions(self):
        """
        Test search auto-complete suggestions functionality.
        Verifies suggestion relevance and performance.
        """
        # Test various prefix lengths
        test_prefixes = ["ran", "late", "mal"]
        
        for prefix in test_prefixes:
            # Get suggestions
            start_time = datetime.now()
            suggestions = await self.service.get_suggestions(prefix, limit=5)
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            # Verify performance
            assert duration_ms < 500, f"Suggestions exceeded 500ms: {duration_ms}ms"

            # Verify suggestions
            assert isinstance(suggestions, list)
            assert len(suggestions) <= 5
            assert all(isinstance(s, str) for s in suggestions)
            assert all(s.lower().startswith(prefix.lower()) for s in suggestions)

    @pytest.mark.performance
    async def test_search_performance(self):
        """
        Test search performance under load.
        Verifies response time SLA compliance.
        """
        # Prepare test queries
        test_queries = [
            "ransomware detection",
            "lateral movement",
            "malware analysis",
            "network traffic",
            "privilege escalation"
        ]

        # Execute concurrent searches
        performance_results = []
        for query_text in test_queries:
            query = SearchQuery(
                query_text=query_text,
                page_size=20,
                page_number=1
            )

            start_time = datetime.now()
            result = await self.service.search(query)
            duration_ms = (datetime.now() - start_time).total_seconds() * 1000

            performance_results.append({
                "query": query_text,
                "duration_ms": duration_ms,
                "hits": len(result.hits)
            })

        # Analyze performance results
        durations = [r["duration_ms"] for r in performance_results]
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        p95_duration = sorted(durations)[int(len(durations) * 0.95)]

        # Verify SLA compliance
        assert avg_duration < PERFORMANCE_THRESHOLD_MS, f"Average duration exceeded SLA: {avg_duration}ms"
        assert p95_duration < PERFORMANCE_THRESHOLD_MS, f"P95 duration exceeded SLA: {p95_duration}ms"

    async def test_search_error_handling(self):
        """
        Test error handling and recovery scenarios.
        Verifies graceful error handling and logging.
        """
        # Test invalid query
        with pytest.raises(SearchServiceError):
            await self.service.search(SearchQuery(
                query_text="*" * 1000,  # Invalid query
                page_size=10,
                page_number=1
            ))

        # Test timeout handling
        with patch("elasticsearch.Elasticsearch.search", side_effect=TimeoutError):
            with pytest.raises(SearchServiceError) as exc_info:
                await self.service.search(SearchQuery(
                    query_text="normal query",
                    page_size=10,
                    page_number=1
                ))
            assert "timeout" in str(exc_info.value).lower()

    async def test_index_management(self):
        """
        Test index management operations.
        Verifies index refresh and health checks.
        """
        # Test index refresh
        assert await self.service.refresh_index()

        # Test index health verification
        with patch("elasticsearch.Elasticsearch.cluster.health") as mock_health:
            mock_health.return_value = {"status": "green"}
            assert self.settings.validate_connection()

            mock_health.return_value = {"status": "red"}
            assert not self.settings.validate_connection()