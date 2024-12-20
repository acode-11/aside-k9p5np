"""
Elasticsearch query builder module for optimized search operations.
Provides advanced query DSL construction with performance optimizations,
natural language processing capabilities, and intelligent scoring.

Version compatibility:
elasticsearch-dsl==8.11.0
typing==3.11.0
"""

from typing import List, Dict, Any, Optional
from elasticsearch_dsl import Search, Q
from elasticsearch_dsl.query import MultiMatch, Range, Terms

from ..models.search_model import SearchQuery
from ..config.elasticsearch import ElasticsearchSettings

# Query optimization constants
DEFAULT_BOOST_NAME = 2.0
DEFAULT_BOOST_DESCRIPTION = 1.5
DEFAULT_BOOST_CONTENT = 1.0
MIN_SHOULD_MATCH = "2"
DEFAULT_FRAGMENT_SIZE = 150
MAX_FRAGMENTS = 3
QUERY_TIMEOUT = "1s"

def build_search_query(search_params: SearchQuery) -> Search:
    """
    Builds an optimized Elasticsearch DSL search query with advanced features
    and performance optimizations.

    Args:
        search_params: SearchQuery model containing search parameters

    Returns:
        Search: Configured Elasticsearch DSL search object
    """
    # Initialize search object with timeout
    search = Search(timeout=QUERY_TIMEOUT)
    
    # Build text search query with field boosting
    text_query = build_text_query(search_params.query_text)
    search = search.query(text_query)

    # Add filters if specified
    if any([search_params.platforms, search_params.tags, search_params.min_quality_score]):
        filter_context = build_filter_context(
            search_params.platforms,
            search_params.tags,
            search_params.min_quality_score
        )
        search = search.filter(filter_context)

    # Configure highlighting
    search = search.highlight_options(**build_highlight_config())
    search = search.highlight(
        'name^2',
        'description^1.5',
        'content'
    )

    # Add pagination
    search = search.extra(
        from_=(search_params.page_number - 1) * search_params.page_size,
        size=search_params.page_size
    )

    # Add performance tracking
    search = search.extra(profile=True)

    # Add result field selection for performance
    search = search.source([
        'id', 'name', 'description', 'platform_type',
        'quality_score', 'created_at', 'updated_at', 'tags'
    ])

    return search

def build_text_query(query_text: str) -> Q:
    """
    Builds an optimized text search query with field boosting and
    relevance scoring.

    Args:
        query_text: Search query text

    Returns:
        Q: Elasticsearch query object
    """
    # Determine query type based on text length
    query_type = "best_fields" if len(query_text.split()) <= 3 else "most_fields"
    
    # Configure field boosts and scoring
    fields = [
        f"name^{DEFAULT_BOOST_NAME}",
        f"description^{DEFAULT_BOOST_DESCRIPTION}",
        f"content^{DEFAULT_BOOST_CONTENT}",
        "tags^1.0"
    ]

    # Build multi-match query with optimizations
    text_query = MultiMatch(
        query=query_text,
        fields=fields,
        type=query_type,
        minimum_should_match=MIN_SHOULD_MATCH,
        operator="and",
        fuzziness="AUTO",
        prefix_length=2,
        max_expansions=50,
        tie_breaker=0.3
    )

    return Q('function_score',
        query=text_query,
        functions=[
            # Boost recent content
            {
                "exp": {
                    "updated_at": {
                        "scale": "30d",
                        "decay": 0.5
                    }
                }
            },
            # Boost high quality content
            {
                "field_value_factor": {
                    "field": "quality_score",
                    "factor": 1.2,
                    "modifier": "sqrt",
                    "missing": 1
                }
            }
        ],
        score_mode="sum",
        boost_mode="multiply"
    )

def build_filter_context(
    platforms: Optional[List[str]],
    tags: Optional[List[str]],
    min_quality_score: Optional[float]
) -> List[Dict[str, Any]]:
    """
    Builds optimized filter context for the search query with caching hints.

    Args:
        platforms: List of platform types to filter
        tags: List of tags to filter
        min_quality_score: Minimum quality score threshold

    Returns:
        List[Dict[str, Any]]: List of filter clauses
    """
    filters = []

    # Add platform filter with caching hint
    if platforms:
        filters.append(Terms(_name="platform_filter", platform_type=platforms))

    # Add tags filter with caching hint
    if tags:
        filters.append(Terms(_name="tags_filter", tags=tags))

    # Add quality score filter
    if min_quality_score is not None:
        filters.append(
            Range(_name="quality_filter", quality_score={'gte': min_quality_score})
        )

    return filters

def build_highlight_config() -> Dict[str, Any]:
    """
    Builds advanced highlighting configuration with field-specific settings.

    Returns:
        Dict[str, Any]: Highlighting configuration
    """
    return {
        'pre_tags': ['<em>'],
        'post_tags': ['</em>'],
        'number_of_fragments': MAX_FRAGMENTS,
        'fragment_size': DEFAULT_FRAGMENT_SIZE,
        'order': 'score',
        'type': 'unified',
        'fields': {
            'name': {
                'number_of_fragments': 1,
                'fragment_size': 100
            },
            'description': {
                'number_of_fragments': 2,
                'fragment_size': 150
            },
            'content': {
                'number_of_fragments': MAX_FRAGMENTS,
                'fragment_size': DEFAULT_FRAGMENT_SIZE,
                'highlight_query': {
                    'bool': {
                        'should': [
                            {'match_phrase': {'content': {'query': '_QUERY_'}}},
                            {'match': {'content': {'query': '_QUERY_', 'fuzziness': 'AUTO'}}}
                        ]
                    }
                }
            }
        }
    }