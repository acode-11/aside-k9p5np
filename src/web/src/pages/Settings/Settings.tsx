import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  TextField, 
  Select, 
  MenuItem, 
  Switch, 
  Button, 
  Typography, 
  Grid, 
  Alert, 
  CircularProgress 
} from '@mui/material'; // v5.14+
import { debounce } from 'lodash'; // v4.17.21

import { 
  SettingsContainer, 
  SettingsSection, 
  SettingsGrid, 
  SettingsHeader, 
  SettingsForm, 
  SettingsSkeleton 
} from './Settings.styles';
import { useAuth } from '../../hooks/useAuth';
import { Theme, NotificationSettings, PlatformType } from '../../types/user.types';

// Interface for user preferences with validation
interface UserPreferences {
  theme: Theme;
  notifications: NotificationSettings;
  defaultPlatform: PlatformType;
  autoSave: boolean;
  syncEnabled: boolean;
  validationLevel: 'STRICT' | 'NORMAL' | 'RELAXED';
}

// Default preferences aligned with system requirements
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: Theme.SYSTEM,
  notifications: NotificationSettings.IMPORTANT,
  defaultPlatform: PlatformType.SIEM,
  autoSave: true,
  syncEnabled: true,
  validationLevel: 'STRICT'
};

// Validation rules for preferences
const VALIDATION_RULES = {
  theme: [Theme.SYSTEM, Theme.LIGHT, Theme.DARK],
  notifications: [NotificationSettings.ALL, NotificationSettings.IMPORTANT, NotificationSettings.NONE],
  platforms: Object.values(PlatformType),
  validationLevels: ['STRICT', 'NORMAL', 'RELAXED'],
  autoSaveDelay: 1000 // ms
};

/**
 * Enhanced Settings page component with role-based access control and auto-save
 */
const Settings: React.FC = () => {
  // Authentication and user state
  const { user, loading: authLoading, userRole } = useAuth();
  
  // Preferences state with validation
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [validation, setValidation] = useState<Record<string, string>>({});

  // Refs for auto-save handling
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const hasUnsavedChanges = useRef(false);

  /**
   * Initialize user preferences with role validation
   */
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        if (user?.preferences) {
          const validatedPrefs = validatePreferences(user.preferences);
          setPreferences(validatedPrefs);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load preferences');
        setLoading(false);
      }
    };

    if (!authLoading && user) {
      loadPreferences();
    }
  }, [user, authLoading]);

  /**
   * Validate preferences against user role and platform permissions
   */
  const validatePreferences = (prefs: Partial<UserPreferences>): UserPreferences => {
    const validated = { ...DEFAULT_PREFERENCES, ...prefs };
    
    // Validate theme selection
    if (!VALIDATION_RULES.theme.includes(validated.theme)) {
      validated.theme = DEFAULT_PREFERENCES.theme;
    }

    // Validate notification settings based on role
    if (!VALIDATION_RULES.notifications.includes(validated.notifications)) {
      validated.notifications = DEFAULT_PREFERENCES.notifications;
    }

    // Validate platform selection against user permissions
    if (user?.platformPermissions) {
      const hasAccess = user.platformPermissions[validated.defaultPlatform]?.canView;
      if (!hasAccess) {
        validated.defaultPlatform = DEFAULT_PREFERENCES.defaultPlatform;
      }
    }

    return validated;
  };

  /**
   * Debounced auto-save handler
   */
  const debouncedSave = useCallback(
    debounce(async (prefsToSave: UserPreferences) => {
      try {
        setSaveStatus('saving');
        // API call would go here
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulated API delay
        setSaveStatus('saved');
        hasUnsavedChanges.current = false;
      } catch (err) {
        setSaveStatus('error');
        setError('Failed to save preferences');
      }
    }, VALIDATION_RULES.autoSaveDelay),
    []
  );

  /**
   * Handle preference changes with validation
   */
  const handlePreferenceChange = useCallback((
    key: keyof UserPreferences,
    value: any
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      const validationError = validateField(key, value);
      
      setValidation(prev => ({
        ...prev,
        [key]: validationError
      }));

      if (!validationError) {
        hasUnsavedChanges.current = true;
        if (updated.autoSave) {
          debouncedSave(updated);
        }
      }

      return updated;
    });
  }, [debouncedSave]);

  /**
   * Validate individual preference field
   */
  const validateField = (key: keyof UserPreferences, value: any): string => {
    switch (key) {
      case 'theme':
        return VALIDATION_RULES.theme.includes(value) ? '' : 'Invalid theme selection';
      case 'notifications':
        return VALIDATION_RULES.notifications.includes(value) ? '' : 'Invalid notification setting';
      case 'defaultPlatform':
        return VALIDATION_RULES.platforms.includes(value) ? '' : 'Invalid platform selection';
      case 'validationLevel':
        return VALIDATION_RULES.validationLevels.includes(value) ? '' : 'Invalid validation level';
      default:
        return '';
    }
  };

  /**
   * Manual save handler
   */
  const handleSave = async () => {
    if (Object.values(validation).some(error => error)) {
      setError('Please correct validation errors before saving');
      return;
    }

    try {
      setSaveStatus('saving');
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulated API delay
      setSaveStatus('saved');
      hasUnsavedChanges.current = false;
    } catch (err) {
      setSaveStatus('error');
      setError('Failed to save preferences');
    }
  };

  // Show loading state
  if (loading || authLoading) {
    return <SettingsSkeleton />;
  }

  return (
    <SettingsContainer>
      <SettingsHeader>
        <Typography variant="h1">Settings</Typography>
        <Typography variant="body1">
          Manage your platform preferences and account settings
        </Typography>
      </SettingsHeader>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <SettingsForm onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <SettingsSection>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          <SettingsGrid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={preferences.theme}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                error={!!validation.theme}
              >
                {VALIDATION_RULES.theme.map(theme => (
                  <MenuItem key={theme} value={theme}>
                    {theme.charAt(0) + theme.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
              {validation.theme && (
                <Typography color="error" variant="caption">
                  {validation.theme}
                </Typography>
              )}
            </Grid>
          </SettingsGrid>
        </SettingsSection>

        <SettingsSection>
          <Typography variant="h6" gutterBottom>
            Notifications
          </Typography>
          <SettingsGrid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={preferences.notifications}
                onChange={(e) => handlePreferenceChange('notifications', e.target.value)}
                error={!!validation.notifications}
              >
                {VALIDATION_RULES.notifications.map(level => (
                  <MenuItem key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </SettingsGrid>
        </SettingsSection>

        <SettingsSection>
          <Typography variant="h6" gutterBottom>
            Platform Settings
          </Typography>
          <SettingsGrid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={preferences.defaultPlatform}
                onChange={(e) => handlePreferenceChange('defaultPlatform', e.target.value)}
                error={!!validation.defaultPlatform}
              >
                {VALIDATION_RULES.platforms.map(platform => (
                  <MenuItem 
                    key={platform} 
                    value={platform}
                    disabled={!user?.platformPermissions?.[platform]?.canView}
                  >
                    {platform}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </SettingsGrid>
        </SettingsSection>

        <SettingsSection>
          <Typography variant="h6" gutterBottom>
            Advanced Settings
          </Typography>
          <SettingsGrid>
            <Grid item xs={12} md={6}>
              <Select
                fullWidth
                value={preferences.validationLevel}
                onChange={(e) => handlePreferenceChange('validationLevel', e.target.value)}
                error={!!validation.validationLevel}
              >
                {VALIDATION_RULES.validationLevels.map(level => (
                  <MenuItem key={level} value={level}>
                    {level.charAt(0) + level.slice(1).toLowerCase()}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography component="div" variant="body2">
                Auto-save Changes
                <Switch
                  checked={preferences.autoSave}
                  onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                />
              </Typography>
            </Grid>
          </SettingsGrid>
        </SettingsSection>

        <Grid container justifyContent="flex-end" spacing={2} sx={{ mt: 2 }}>
          {!preferences.autoSave && (
            <Grid item>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={saveStatus === 'saving' || !hasUnsavedChanges.current}
                startIcon={saveStatus === 'saving' ? <CircularProgress size={20} /> : null}
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
              </Button>
            </Grid>
          )}
          {saveStatus === 'saved' && (
            <Grid item>
              <Alert severity="success" sx={{ py: 0 }}>
                Settings saved successfully
              </Alert>
            </Grid>
          )}
        </Grid>
      </SettingsForm>
    </SettingsContainer>
  );
};

export default Settings;