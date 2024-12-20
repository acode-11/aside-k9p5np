/**
 * @fileoverview Defines constant route paths and navigation configuration for the application's routing system.
 * Ensures consistent URL patterns across components with type safety and parameter validation.
 * @version 1.0.0
 */

/**
 * Core application route paths.
 * Immutable object containing all valid route paths used for navigation.
 */
export const ROUTES = {
  ROOT: '/',
  DASHBOARD: '/dashboard',
  DETECTION_LIBRARY: '/detections',
  DETECTION_DETAIL: '/detections/:detectionId',
  DETECTION_EDITOR: '/detections/:detectionId/edit',
  COMMUNITY: '/community',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings'
} as const;

/**
 * URL parameter placeholders for dynamic routing.
 * Used in conjunction with route paths to generate complete URLs.
 */
export const ROUTE_PARAMS = {
  DETECTION_ID: ':detectionId',
  COMMUNITY_ID: ':communityId'
} as const;

/**
 * Type-safe interface for route configuration objects.
 * Enforces required properties for each route definition.
 */
export interface RouteConfig {
  /** The URL path pattern for the route */
  path: string;
  /** Human-readable title for the route (used in navigation/breadcrumbs) */
  title: string;
  /** Whether the route requires authentication to access */
  requiresAuth: boolean;
}

/**
 * Type guard to check if a route path exists in ROUTES
 * @param route - Route path to validate
 * @returns True if route exists in ROUTES
 */
const isValidRoute = (route: string): route is keyof typeof ROUTES => {
  return Object.values(ROUTES).includes(route as any);
};

/**
 * Validates parameter values against allowed patterns
 * @param param - Parameter value to validate
 * @returns True if parameter matches allowed pattern
 */
const isValidParam = (param: string): boolean => {
  // UUID pattern for IDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidPattern.test(param);
};

/**
 * Generates a complete route path with validated parameter replacements.
 * @param route - Base route path from ROUTES
 * @param params - Key-value pairs of parameters to inject
 * @returns Complete route path with parameters
 * @throws Error if route or parameters are invalid
 */
export const generatePath = (route: string, params?: Record<string, string>): string => {
  if (!isValidRoute(route)) {
    throw new Error(`Invalid route path: ${route}`);
  }

  if (!params) {
    return route;
  }

  let path = route;
  const requiredParams = route.match(/:[a-zA-Z]+/g) || [];

  // Validate all required parameters are provided
  for (const param of requiredParams) {
    const paramName = param.slice(1); // Remove : prefix
    const paramValue = params[paramName];

    if (!paramValue) {
      throw new Error(`Missing required parameter: ${paramName}`);
    }

    if (!isValidParam(paramValue)) {
      throw new Error(`Invalid parameter value for ${paramName}: ${paramValue}`);
    }

    path = path.replace(param, paramValue);
  }

  return path;
};

/**
 * Route configuration map defining metadata for each route.
 * Used for navigation and access control.
 */
export const ROUTE_CONFIG: Record<keyof typeof ROUTES, RouteConfig> = {
  ROOT: {
    path: ROUTES.ROOT,
    title: 'Home',
    requiresAuth: false
  },
  DASHBOARD: {
    path: ROUTES.DASHBOARD,
    title: 'Dashboard',
    requiresAuth: true
  },
  DETECTION_LIBRARY: {
    path: ROUTES.DETECTION_LIBRARY,
    title: 'Detection Library',
    requiresAuth: true
  },
  DETECTION_DETAIL: {
    path: ROUTES.DETECTION_DETAIL,
    title: 'Detection Details',
    requiresAuth: true
  },
  DETECTION_EDITOR: {
    path: ROUTES.DETECTION_EDITOR,
    title: 'Detection Editor',
    requiresAuth: true
  },
  COMMUNITY: {
    path: ROUTES.COMMUNITY,
    title: 'Community',
    requiresAuth: true
  },
  ANALYTICS: {
    path: ROUTES.ANALYTICS,
    title: 'Analytics',
    requiresAuth: true
  },
  SETTINGS: {
    path: ROUTES.SETTINGS,
    title: 'Settings',
    requiresAuth: true
  }
} as const;