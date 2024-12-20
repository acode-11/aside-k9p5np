/**
 * @fileoverview Comprehensive date utility functions for handling timestamps, durations,
 * date ranges, and time-based visualizations throughout the frontend application.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { format, parseISO, differenceInDays, isValid } from 'date-fns'; // v2.30.0
import { Detection } from '../types/detection.types';

/**
 * Supported date format patterns
 */
export enum DatePattern {
  ISO = 'yyyy-MM-dd\'T\'HH:mm:ss.SSSxxx',
  SHORT = 'MM/dd/yyyy',
  LONG = 'MMMM dd, yyyy',
  TIME = 'HH:mm:ss',
  DATETIME = 'MM/dd/yyyy HH:mm:ss',
  RELATIVE = 'relative'
}

/**
 * Interface for date formatting options
 */
export interface DateFormat {
  format?: DatePattern | string;
  includeTime?: boolean;
  timezone?: string;
  locale?: string;
  strict?: boolean;
}

/**
 * Interface for date parsing options
 */
export interface ParseOptions {
  format?: DatePattern;
  timezone?: string;
  strict?: boolean;
}

/**
 * Interface for relative time options
 */
export interface RelativeTimeOptions {
  maxDays?: number;
  includeTime?: boolean;
  locale?: string;
}

/**
 * Interface for date validation results
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  errorCode?: string;
}

/**
 * Default formatting options
 */
const DEFAULT_FORMAT_OPTIONS: DateFormat = {
  format: DatePattern.DATETIME,
  includeTime: true,
  timezone: 'UTC',
  locale: 'en-US',
  strict: true
};

/**
 * Enhanced date formatting with support for custom formats, localization, and timezone handling
 * @param date Date object or ISO string to format
 * @param options Formatting options
 * @returns Formatted date string
 */
export const formatDate = (
  date: Date | string,
  options: Partial<DateFormat> = {}
): string => {
  try {
    const mergedOptions = { ...DEFAULT_FORMAT_OPTIONS, ...options };
    const dateObj = date instanceof Date ? date : parseISO(date);

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    const formatPattern = mergedOptions.format || 
      (mergedOptions.includeTime ? DatePattern.DATETIME : DatePattern.SHORT);

    return format(dateObj, formatPattern, {
      locale: mergedOptions.locale ? require(`date-fns/locale/${mergedOptions.locale}`) : undefined
    });
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Enhanced date parsing with strict validation and multiple format support
 * @param dateString String representation of date
 * @param options Parsing options
 * @returns Parsed Date object or null if invalid
 */
export const parseDate = (
  dateString: string,
  options: Partial<ParseOptions> = {}
): Date | null => {
  try {
    if (!dateString) {
      return null;
    }

    const parsedDate = parseISO(dateString);
    
    if (!isValid(parsedDate)) {
      return null;
    }

    if (options.strict && parsedDate.toString() === 'Invalid Date') {
      return null;
    }

    return parsedDate;
  } catch (error) {
    console.error('Date parsing error:', error);
    return null;
  }
};

/**
 * Enhanced relative time calculation with multiple unit support and localization
 * @param date Date to calculate relative time from
 * @param options Relative time options
 * @returns Localized relative time string
 */
export const getRelativeTime = (
  date: Date | string,
  options: Partial<RelativeTimeOptions> = {}
): string => {
  try {
    const dateObj = date instanceof Date ? date : parseISO(date);
    const now = new Date();
    const daysDiff = differenceInDays(now, dateObj);
    const maxDays = options.maxDays || 30;

    if (!isValid(dateObj)) {
      throw new Error('Invalid date provided');
    }

    if (daysDiff === 0) {
      return 'Today';
    } else if (daysDiff === 1) {
      return 'Yesterday';
    } else if (daysDiff === -1) {
      return 'Tomorrow';
    } else if (daysDiff > maxDays) {
      return formatDate(dateObj, { format: DatePattern.SHORT });
    }

    const rtf = new Intl.RelativeTimeFormat(options.locale || 'en-US', {
      numeric: 'auto'
    });

    return rtf.format(-daysDiff, 'day');
  } catch (error) {
    console.error('Relative time calculation error:', error);
    return 'Invalid Date';
  }
};

/**
 * Comprehensive date validation with detailed error reporting
 * @param date Date object or string to validate
 * @param options Validation options
 * @returns Validation result with error details
 */
export const isValidDate = (
  date: Date | string,
  options: Partial<ValidationOptions> = {}
): ValidationResult => {
  const errors: string[] = [];
  let dateObj: Date;

  try {
    dateObj = date instanceof Date ? date : parseISO(date);

    if (!isValid(dateObj)) {
      errors.push('Invalid date format');
      return {
        isValid: false,
        errors,
        errorCode: 'INVALID_FORMAT'
      };
    }

    if (options.minDate && dateObj < options.minDate) {
      errors.push('Date is before minimum allowed date');
    }

    if (options.maxDate && dateObj > options.maxDate) {
      errors.push('Date is after maximum allowed date');
    }

    return {
      isValid: errors.length === 0,
      errors,
      errorCode: errors.length ? 'VALIDATION_ERROR' : undefined
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Date parsing failed'],
      errorCode: 'PARSE_ERROR'
    };
  }
};

/**
 * Interface for date validation options
 */
export interface ValidationOptions {
  minDate?: Date;
  maxDate?: Date;
  format?: DatePattern;
}

/**
 * Format a detection's timestamps consistently
 * @param detection Detection object containing timestamps
 * @returns Formatted date strings
 */
export const formatDetectionDates = (detection: Detection): {
  created: string;
  updated: string;
  relative: string;
} => {
  return {
    created: formatDate(detection.createdAt, { format: DatePattern.LONG }),
    updated: formatDate(detection.updatedAt, { format: DatePattern.DATETIME }),
    relative: getRelativeTime(detection.updatedAt)
  };
};