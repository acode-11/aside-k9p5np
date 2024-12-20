import { Request, Response, NextFunction } from 'express'; // v4.18.2
import rateLimit from 'express-rate-limit'; // v7.1.0
import winston from 'winston'; // v3.11.0
import { verifyToken } from '../utils/token.utils';
import { AUTH_CONFIG } from '../config/auth.config';
import { UserRole } from '../models/user.model';
import crypto from 'crypto';

// Configure security-focused logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'auth.log' })
  ]
});

// Rate limiter for authentication attempts
const authRateLimiter = rateLimit({
  windowMs: AUTH_CONFIG.security.rateLimitWindow * 1000,
  max: AUTH_CONFIG.security.rateLimit,
  message: 'Too many authentication attempts, please try again later'
});

/**
 * Extended Express Request interface with user data and request context
 */
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    roles: UserRole[];
    organizationId: string;
    teamId: string;
    permissions: string[];
    sessionId: string;
    lastActive: Date;
  };
  context: {
    requestId: string;
    origin: string;
    userAgent: string;
    ip: string;
  };
}

/**
 * Middleware to validate JWT tokens with comprehensive security checks
 */
export const validateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate unique request ID for tracing
    const requestId = crypto.randomBytes(16).toString('hex');

    // Apply rate limiting
    await new Promise((resolve) => authRateLimiter(req, res, resolve));

    // Validate request origin
    const origin = req.get('origin');
    if (AUTH_CONFIG.security.allowedOrigins.length > 0 && 
        !AUTH_CONFIG.security.allowedOrigins.includes(origin || '')) {
      throw new Error('Invalid request origin');
    }

    // Extract and validate Bearer token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new Error('No token provided');
    }

    // Verify token with comprehensive validation
    const decodedToken = await verifyToken(token, {
      purpose: 'access',
      deviceId: req.get('x-device-id'),
      userAgent: req.get('user-agent')
    });

    // Extend request with authenticated user data
    (req as AuthenticatedRequest).user = {
      userId: decodedToken.userId,
      roles: [decodedToken.role as UserRole],
      organizationId: decodedToken.organizationId,
      teamId: decodedToken.metadata?.teamId,
      permissions: decodedToken.metadata?.permissions || [],
      sessionId: decodedToken.jti,
      lastActive: new Date()
    };

    // Add request context
    (req as AuthenticatedRequest).context = {
      requestId,
      origin: origin || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      ip: req.ip
    };

    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    });

    // Log successful authentication
    if (AUTH_CONFIG.security.enableAuditLog) {
      logger.info('Authentication successful', {
        requestId,
        userId: decodedToken.userId,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    next();
  } catch (error) {
    // Log authentication failure
    if (AUTH_CONFIG.security.enableAuditLog) {
      logger.warn('Authentication failed', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }

    res.status(401).json({
      error: 'Authentication failed',
      message: error.message,
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Role hierarchy for permission inheritance
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: Object.values(UserRole),
  [UserRole.ORGANIZATION_ADMIN]: [UserRole.ORGANIZATION_ADMIN, UserRole.TEAM_LEAD, UserRole.CONTRIBUTOR, UserRole.READER],
  [UserRole.TEAM_LEAD]: [UserRole.TEAM_LEAD, UserRole.CONTRIBUTOR, UserRole.READER],
  [UserRole.CONTRIBUTOR]: [UserRole.CONTRIBUTOR, UserRole.READER],
  [UserRole.READER]: [UserRole.READER]
};

/**
 * Advanced middleware factory for role-based access control
 */
export const requireRole = (
  allowedRoles: UserRole[],
  options: {
    requireAll?: boolean;
    checkOrganization?: boolean;
    additionalPermissions?: string[];
  } = {}
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authenticatedReq = req as AuthenticatedRequest;
      
      if (!authenticatedReq.user) {
        throw new Error('User not authenticated');
      }

      const userRoles = authenticatedReq.user.roles;
      let hasRequiredRole = false;

      // Check role hierarchy
      for (const userRole of userRoles) {
        const inheritedRoles = ROLE_HIERARCHY[userRole] || [];
        const hasRole = options.requireAll
          ? allowedRoles.every(role => inheritedRoles.includes(role))
          : allowedRoles.some(role => inheritedRoles.includes(role));

        if (hasRole) {
          hasRequiredRole = true;
          break;
        }
      }

      if (!hasRequiredRole) {
        throw new Error('Insufficient role permissions');
      }

      // Check organization context if required
      if (options.checkOrganization && req.params.organizationId) {
        if (authenticatedReq.user.organizationId !== req.params.organizationId) {
          throw new Error('Organization mismatch');
        }
      }

      // Check additional permissions if specified
      if (options.additionalPermissions?.length) {
        const hasPermissions = options.additionalPermissions.every(
          permission => authenticatedReq.user.permissions.includes(permission)
        );
        if (!hasPermissions) {
          throw new Error('Missing required permissions');
        }
      }

      // Log authorization decision
      if (AUTH_CONFIG.security.enableAuditLog) {
        logger.info('Authorization successful', {
          requestId: authenticatedReq.context.requestId,
          userId: authenticatedReq.user.userId,
          roles: userRoles,
          allowedRoles
        });
      }

      next();
    } catch (error) {
      // Log authorization failure
      if (AUTH_CONFIG.security.enableAuditLog) {
        logger.warn('Authorization failed', {
          error: error.message,
          ip: req.ip,
          userAgent: req.get('user-agent')
        });
      }

      res.status(403).json({
        error: 'Authorization failed',
        message: error.message,
        code: 'FORBIDDEN'
      });
    }
  };
};