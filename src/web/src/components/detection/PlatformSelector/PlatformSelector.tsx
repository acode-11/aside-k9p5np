import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.2.0
import { MenuItem, FormControl, SelectChangeEvent, CircularProgress, Alert } from '@mui/material'; // v5.14+
import { useTranslation } from 'react-i18next'; // v13.0+

// Internal imports
import {
  PlatformSelectorContainer,
  PlatformSelect,
  PlatformIcon,
  PlatformError,
  PlatformLoading
} from './PlatformSelector.styles';
import {
  PlatformType,
  IPlatform,
  PlatformValidationError
} from '../../../types/platform.types';
import { usePlatform, useTheme, useAnalytics } from '../../../hooks/usePlatform';

// Platform icons mapping
const PLATFORM_ICONS = {
  [PlatformType.SIEM]: '../../../assets/images/platform-logos/siem.svg',
  [PlatformType.EDR]: '../../../assets/images/platform-logos/edr.svg',
  [PlatformType.NSM]: '../../../assets/images/platform-logos/nsm.svg',
  fallback: '../../../assets/images/platform-logos/default.svg'
} as const;

// Analytics event names
const ANALYTICS_EVENTS = {
  PLATFORM_SELECTED: 'platform_selected',
  PLATFORM_ERROR: 'platform_error',
  PLATFORM_VALIDATION_FAILED: 'platform_validation_failed'
} as const;

interface PlatformSelectorProps {
  selectedPlatform?: PlatformType;
  onPlatformChange: (platform: PlatformType) => void;
  disabled?: boolean;
  required?: boolean;
  errorMessage?: string;
  'aria-label'?: string;
}

/**
 * PlatformSelector component provides an accessible interface for selecting security platforms
 * with integrated validation, loading states, and error handling.
 *
 * @param {PlatformSelectorProps} props - Component props
 * @returns {JSX.Element} Rendered platform selector component
 */
export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onPlatformChange,
  disabled = false,
  required = false,
  errorMessage,
  'aria-label': ariaLabel
}) => {
  // Hooks initialization
  const { t } = useTranslation();
  const { platforms, validatePlatformCapabilities } = usePlatform();
  const { trackEvent } = useAnalytics();
  const { isDarkMode } = useTheme();

  // Local state management
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState<PlatformType | ''>('');
  
  // Refs for handling async operations
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPlatform) {
      setInternalValue(selectedPlatform);
    }
  }, [selectedPlatform]);

  /**
   * Handles platform selection change with validation
   * @param {SelectChangeEvent} event - Selection change event
   */
  const handlePlatformChange = useCallback(async (event: SelectChangeEvent<PlatformType>) => {
    const newValue = event.target.value as PlatformType;
    
    try {
      setLoading(true);
      setError(null);

      // Validate platform selection
      const platform = platforms.find((p: IPlatform) => p.type === newValue);
      if (!platform) {
        throw new Error(t('platform.errors.notFound'));
      }

      const isValid = await validatePlatformCapabilities(platform);
      if (!isValid) {
        throw new Error(t('platform.errors.validation'));
      }

      // Track successful selection
      trackEvent(ANALYTICS_EVENTS.PLATFORM_SELECTED, {
        platformType: newValue,
        timestamp: new Date().toISOString()
      });

      if (mountedRef.current) {
        setInternalValue(newValue);
        onPlatformChange(newValue);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('platform.errors.unknown');
      
      if (mountedRef.current) {
        setError(errorMessage);
        trackEvent(ANALYTICS_EVENTS.PLATFORM_ERROR, {
          platformType: newValue,
          error: errorMessage
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [platforms, validatePlatformCapabilities, t, trackEvent, onPlatformChange]);

  /**
   * Renders platform icon with fallback handling
   * @param {PlatformType} platform - Platform type
   * @returns {string} Platform icon URL
   */
  const getPlatformIcon = useCallback((platform: PlatformType): string => {
    return PLATFORM_ICONS[platform] || PLATFORM_ICONS.fallback;
  }, []);

  return (
    <PlatformSelectorContainer
      error={!!error || !!errorMessage}
      disabled={disabled}
      required={required}
      aria-busy={loading}
      data-testid="platform-selector"
    >
      <PlatformSelect
        value={internalValue}
        onChange={handlePlatformChange}
        disabled={disabled || loading}
        error={!!error || !!errorMessage}
        aria-label={ariaLabel || t('platform.selector.ariaLabel')}
        aria-required={required}
        aria-invalid={!!error || !!errorMessage}
        aria-errormessage={error || errorMessage || undefined}
        displayEmpty
        renderValue={(selected) => (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {selected && (
              <PlatformIcon
                src={getPlatformIcon(selected as PlatformType)}
                alt={`${selected} icon`}
                aria-hidden="true"
              />
            )}
            {selected ? t(`platform.types.${selected}`) : t('platform.selector.placeholder')}
          </div>
        )}
      >
        {platforms.map((platform: IPlatform) => (
          <MenuItem
            key={platform.type}
            value={platform.type}
            aria-label={t(`platform.types.${platform.type}`)}
          >
            <PlatformIcon
              src={getPlatformIcon(platform.type)}
              alt={`${platform.type} icon`}
              aria-hidden="true"
            />
            {t(`platform.types.${platform.type}`)}
          </MenuItem>
        ))}
      </PlatformSelect>

      {loading && (
        <PlatformLoading>
          <CircularProgress size={20} />
          <span className="sr-only">{t('platform.selector.loading')}</span>
        </PlatformLoading>
      )}

      {(error || errorMessage) && (
        <PlatformError>
          <Alert severity="error" variant="outlined">
            {error || errorMessage}
          </Alert>
        </PlatformError>
      )}
    </PlatformSelectorContainer>
  );
};

export default PlatformSelector;