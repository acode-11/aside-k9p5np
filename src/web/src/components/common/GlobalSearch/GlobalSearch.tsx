/**
 * @fileoverview Enhanced global search component with natural language capabilities,
 * auto-complete, accessibility features, and performance optimizations.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react'; // v18.2.0
import { IconButton, CircularProgress, Tooltip, Snackbar } from '@mui/material'; // v5.14+
import { Search as SearchIcon, Clear as ClearIcon, Error as ErrorIcon } from '@mui/icons-material'; // v5.14+
import { SearchContainer, SearchInput, SearchResults, ResultItem } from './GlobalSearch.styles';
import { useSearch } from '../../../hooks/useSearch';
import { Detection } from '../../../types/detection.types';

// Constants for component configuration
const DEBOUNCE_DELAY = 300;
const MAX_VISIBLE_RESULTS = 10;
const RETRY_ATTEMPTS = 3;
const ERROR_DISPLAY_DURATION = 5000;

interface GlobalSearchProps {
  onResultSelect?: (detection: Detection) => void;
  placeholder?: string;
  className?: string;
  maxResults?: number;
  debounceDelay?: number;
}

/**
 * Enhanced global search component with accessibility and performance optimizations
 */
const GlobalSearch: React.FC<GlobalSearchProps> = memo(({
  onResultSelect,
  placeholder = 'Search detections...',
  className,
  maxResults = MAX_VISIBLE_RESULTS,
  debounceDelay = DEBOUNCE_DELAY
}) => {
  // State management
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs for DOM elements and timers
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Custom hook for search functionality
  const {
    results,
    isLoading,
    suggestions,
    handleSearch,
    error
  } = useSearch();

  /**
   * Handles input changes with debounce optimization
   */
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
      setIsOpen(true);
    }, debounceDelay);
  }, [debounceDelay, handleSearch]);

  /**
   * Handles keyboard navigation and accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => 
          prev < Math.min(results.length, maxResults) - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => prev > -1 ? prev - 1 : prev);
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          onResultSelect?.(results[selectedIndex]);
          setIsOpen(false);
          setQuery('');
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        break;
    }
  }, [results, selectedIndex, maxResults, onResultSelect]);

  /**
   * Handles result selection
   */
  const handleResultClick = useCallback((detection: Detection) => {
    onResultSelect?.(detection);
    setIsOpen(false);
    setQuery('');
    inputRef.current?.focus();
  }, [onResultSelect]);

  /**
   * Handles search clear
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  }, []);

  /**
   * Effect for error handling and notifications
   */
  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
      const timer = setTimeout(() => setErrorMessage(null), ERROR_DISPLAY_DURATION);
      return () => clearTimeout(timer);
    }
  }, [error]);

  /**
   * Effect for cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Effect for handling click outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <SearchContainer className={className} role="search">
      <SearchInput
        ref={inputRef}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        startAdornment={
          <Tooltip title="Search">
            <IconButton size="small" aria-label="search">
              <SearchIcon />
            </IconButton>
          </Tooltip>
        }
        endAdornment={
          <>
            {isLoading && <CircularProgress size={20} />}
            {query && (
              <Tooltip title="Clear search">
                <IconButton
                  size="small"
                  onClick={handleClear}
                  aria-label="clear search"
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        }
        inputProps={{
          'aria-label': 'search detections',
          'aria-expanded': isOpen,
          'aria-activedescendant': selectedIndex >= 0 ? `result-${selectedIndex}` : undefined,
          'aria-controls': 'search-results',
          'aria-autocomplete': 'list'
        }}
      />

      {isOpen && (results.length > 0 || suggestions.length > 0) && (
        <SearchResults
          ref={resultsRef}
          id="search-results"
          role="listbox"
          aria-label="search results"
        >
          {results.slice(0, maxResults).map((detection, index) => (
            <ResultItem
              key={detection.id}
              role="option"
              id={`result-${index}`}
              className={selectedIndex === index ? 'selected' : ''}
              onClick={() => handleResultClick(detection)}
              aria-selected={selectedIndex === index}
              tabIndex={0}
            >
              <div>
                <strong>{detection.name}</strong>
                <div>{detection.description}</div>
                <small>
                  Platform: {detection.platformType} | 
                  Accuracy: {detection.metadata.confidence}%
                </small>
              </div>
            </ResultItem>
          ))}
        </SearchResults>
      )}

      <Snackbar
        open={!!errorMessage}
        message={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ErrorIcon style={{ marginRight: 8 }} />
            {errorMessage}
          </div>
        }
        autoHideDuration={ERROR_DISPLAY_DURATION}
        onClose={() => setErrorMessage(null)}
      />
    </SearchContainer>
  );
});

GlobalSearch.displayName = 'GlobalSearch';

export default GlobalSearch;