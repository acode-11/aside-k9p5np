"""
Search service models module providing enhanced Pydantic models for search functionality.
Implements data structures for search queries, results, and Elasticsearch document mappings
with optimized analyzer configurations and performance tracking.

Version compatibility:
pydantic==2.4.2
elasticsearch-dsl==8.11.0
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, validator, constr
from elasticsearch_dsl import Document, Date, Keyword, Text, Float, Integer, Nested
from elasticsearch_dsl.connections import connections

from ..config.elasticsearch import ElasticsearchSettings

# Constants for validation
MIN_QUERY_LENGTH = 3
MAX_QUERY_LENGTH = 500
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_QUALITY_SCORE = 0.0
MAX_QUALITY_SCORE = 1.0

class SearchQuery(BaseModel):
    """
    Enhanced Pydantic model for search query parameters with comprehensive validation.
    Supports natural language queries with advanced filtering capabilities.
    """
    query_text: constr(min_length=MIN_QUERY_LENGTH, max_length=MAX_QUERY_LENGTH) = Field(
        ...,
        description="Natural language search query text"
    )
    platforms: Optional[List[str]] = Field(
        default=None,
        description="List of platform types to filter results"
    )
    tags: Optional[List[str]] = Field(
        default=None,
        description="List of tags to filter results"
    )
    min_quality_score: Optional[float] = Field(
        default=None,
        ge=MIN_QUALITY_SCORE,
        le=MAX_QUALITY_SCORE,
        description="Minimum quality score filter"
    )
    from_: Optional[int] = Field(
        default=0,
        ge=0,
        description="Starting offset for pagination"
    )
    size: Optional[int] = Field(
        default=DEFAULT_PAGE_SIZE,
        ge=1,
        le=MAX_PAGE_SIZE,
        description="Number of results per page"
    )
    sort_options: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Custom sort options"
    )

    @validator("platforms")
    def validate_platforms(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate platform types against allowed values."""
        if v:
            valid_platforms = {"SIEM", "EDR", "NSM"}
            invalid_platforms = set(v) - valid_platforms
            if invalid_platforms:
                raise ValueError(f"Invalid platform types: {invalid_platforms}")
        return v

    @validator("tags")
    def validate_tags(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Validate tag format and length."""
        if v:
            for tag in v:
                if not tag.isalnum() and not all(c in "-_" for c in tag if not c.isalnum()):
                    raise ValueError(f"Invalid tag format: {tag}")
                if len(tag) > 50:
                    raise ValueError(f"Tag too long: {tag}")
        return v

class SearchHit(BaseModel):
    """
    Enhanced Pydantic model for individual search result with highlighting
    and metadata enrichment.
    """
    id: str = Field(..., description="Unique identifier")
    name: str = Field(..., description="Detection name")
    description: str = Field(..., description="Detection description")
    platform_type: str = Field(..., description="Platform type")
    score: float = Field(..., ge=0.0, le=1.0, description="Normalized relevance score")
    highlights: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Highlighted text snippets"
    )
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata"
    )

    @validator("score")
    def normalize_score(cls, v: float) -> float:
        """Normalize score to range [0.0, 1.0]."""
        return max(0.0, min(1.0, v))

class SearchResult(BaseModel):
    """
    Enhanced Pydantic model for search results with comprehensive
    performance metrics and aggregations.
    """
    hits: List[SearchHit] = Field(..., description="Search results")
    total: int = Field(..., ge=0, description="Total number of matches")
    took_ms: int = Field(..., ge=0, description="Search execution time in milliseconds")
    max_score: float = Field(..., ge=0.0, description="Maximum relevance score")
    aggregations: Dict[str, Any] = Field(
        default_factory=dict,
        description="Search result aggregations"
    )
    performance_metrics: Dict[str, Any] = Field(
        default_factory=dict,
        description="Detailed performance metrics"
    )

    @validator("performance_metrics")
    def validate_performance(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and enrich performance metrics."""
        required_metrics = {"query_time_ms", "total_shards", "successful_shards"}
        missing_metrics = required_metrics - set(v.keys())
        if missing_metrics:
            raise ValueError(f"Missing required performance metrics: {missing_metrics}")
        return v

@Document(index=ElasticsearchSettings().index_name)
class DetectionDocument:
    """
    Enhanced Elasticsearch DSL document mapping for detections with
    optimized analyzers and field configurations.
    """
    id = Keyword()
    name = Text(
        analyzer='detection_analyzer',
        fields={'keyword': Keyword(normalizer='lowercase')},
        boost=2.0
    )
    description = Text(
        analyzer='detection_analyzer',
        boost=1.5
    )
    content = Text(
        analyzer='detection_analyzer',
        term_vector='with_positions_offsets'
    )
    platform_type = Keyword()
    tags = Keyword(multi=True)
    quality_score = Float()
    created_at = Date()
    updated_at = Date()
    metadata = Nested(
        properties={
            'mitre_tactics': Keyword(multi=True),
            'mitre_techniques': Keyword(multi=True),
            'severity': Keyword(),
            'confidence': Float()
        }
    )

    class Index:
        name = ElasticsearchSettings().index_name
        settings = {
            'number_of_shards': 3,
            'number_of_replicas': 2,
            'refresh_interval': '1s'
        }

    @classmethod
    def from_detection(cls, detection_data: Dict[str, Any]) -> 'DetectionDocument':
        """
        Create an optimized document instance from detection data.
        
        Args:
            detection_data: Dictionary containing detection information
            
        Returns:
            DetectionDocument: Initialized Elasticsearch document instance
        """
        doc = cls()
        doc.meta.id = detection_data['id']
        
        # Map core fields
        doc.id = detection_data['id']
        doc.name = detection_data['name']
        doc.description = detection_data['description']
        doc.content = detection_data.get('content', '')
        doc.platform_type = detection_data['platform_type']
        doc.tags = detection_data.get('tags', [])
        doc.quality_score = detection_data.get('quality_score', 0.0)
        doc.created_at = detection_data['created_at']
        doc.updated_at = detection_data['updated_at']
        
        # Map metadata fields
        doc.metadata = {
            'mitre_tactics': detection_data.get('metadata', {}).get('mitre_tactics', []),
            'mitre_techniques': detection_data.get('metadata', {}).get('mitre_techniques', []),
            'severity': detection_data.get('metadata', {}).get('severity', 'medium'),
            'confidence': detection_data.get('metadata', {}).get('confidence', 0.0)
        }
        
        return doc