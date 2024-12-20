import { jwt as jwtConfig } from '../config/auth.config';
import { IUser } from '../models/user.model';
import jwt from 'jsonwebtoken'; // v9.0.2
import { promises as fs } from 'fs/promises';
import crypto from 'crypto';

/**
 * Interface for JWT token payload with comprehensive user and security metadata
 */
interface TokenPayload {
  userId: string;
  role: string;
  organizationId: string;
  iat: number;
  exp: number;
  jti: string;
  purpose: 'access' | 'refresh';
  deviceId?: string;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    lastRotated?: number;
  };
}

/**
 * Interface for token pair response with metadata
 */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * Options for token generation and validation
 */
interface TokenOptions {
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  purpose?: 'access' | 'refresh';
}

/**
 * Cache for storing loaded key pairs with rotation support
 */
let keyCache: {
  privateKey?: string;
  publicKey?: string;
  lastLoaded?: number;
} = {};

/**
 * Loads and caches RSA keys with rotation support
 */
async function loadKeys(): Promise<void> {
  const now = Date.now();
  const rotationThreshold = jwtConfig.keyRotationInterval * 1000;

  // Check if keys need rotation
  if (!keyCache.lastLoaded || now - keyCache.lastLoaded > rotationThreshold) {
    try {
      const [privateKey, publicKey] = await Promise.all([
        fs.readFile(jwtConfig.privateKeyPath, 'utf8'),
        fs.readFile(jwtConfig.publicKeyPath, 'utf8')
      ]);

      keyCache = {
        privateKey,
        publicKey,
        lastLoaded: now
      };
    } catch (error) {
      throw new Error('Failed to load JWT keys: ' + error.message);
    }
  }
}

/**
 * Generates a unique token identifier
 */
function generateTokenId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generates a new pair of access and refresh tokens for a user
 * with comprehensive security controls and metadata
 */
export async function generateTokenPair(
  user: IUser,
  options: TokenOptions = {}
): Promise<TokenPair> {
  await loadKeys();

  if (!keyCache.privateKey) {
    throw new Error('Private key not loaded');
  }

  const now = Math.floor(Date.now() / 1000);

  // Common token payload
  const basePayload = {
    userId: user.id,
    role: user.role,
    organizationId: user.organizationId,
    deviceId: options.deviceId,
    metadata: {
      userAgent: options.userAgent,
      ipAddress: options.ipAddress,
      lastRotated: now
    }
  };

  // Generate access token
  const accessToken = jwt.sign(
    {
      ...basePayload,
      purpose: 'access',
      jti: generateTokenId()
    },
    keyCache.privateKey,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: jwtConfig.accessTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }
  );

  // Generate refresh token with longer expiry
  const refreshToken = jwt.sign(
    {
      ...basePayload,
      purpose: 'refresh',
      jti: generateTokenId()
    },
    keyCache.privateKey,
    {
      algorithm: jwtConfig.algorithm,
      expiresIn: jwtConfig.refreshTokenExpiry,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }
  );

  // Calculate expiration time for client
  const decodedAccess = jwt.decode(accessToken) as TokenPayload;
  const expiresIn = (decodedAccess.exp - now) * 1000;

  return {
    accessToken,
    refreshToken,
    expiresIn,
    tokenType: 'Bearer'
  };
}

/**
 * Verifies and decodes a JWT token with comprehensive security validations
 */
export async function verifyToken(
  token: string,
  options: TokenOptions = {}
): Promise<TokenPayload> {
  await loadKeys();

  if (!keyCache.publicKey) {
    throw new Error('Public key not loaded');
  }

  try {
    // Verify token signature and claims
    const decoded = jwt.verify(token, keyCache.publicKey, {
      algorithms: [jwtConfig.algorithm],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    }) as TokenPayload;

    // Additional security validations
    if (options.purpose && decoded.purpose !== options.purpose) {
      throw new Error('Invalid token purpose');
    }

    if (options.deviceId && decoded.deviceId !== options.deviceId) {
      throw new Error('Invalid device identifier');
    }

    // Token blacklist check would go here if enabled
    if (jwtConfig.enableBlacklist) {
      // Implementation of blacklist check
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token: ' + error.message);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw error;
  }
}

/**
 * Generates a new access token using a valid refresh token
 * with enhanced security checks and rotation tracking
 */
export async function refreshAccessToken(
  refreshToken: string,
  options: TokenOptions = {}
): Promise<string> {
  try {
    // Verify refresh token
    const decoded = await verifyToken(refreshToken, {
      ...options,
      purpose: 'refresh'
    });

    // Generate new access token
    const accessToken = jwt.sign(
      {
        userId: decoded.userId,
        role: decoded.role,
        organizationId: decoded.organizationId,
        purpose: 'access',
        jti: generateTokenId(),
        deviceId: decoded.deviceId,
        metadata: {
          ...decoded.metadata,
          lastRotated: Math.floor(Date.now() / 1000)
        }
      },
      keyCache.privateKey!,
      {
        algorithm: jwtConfig.algorithm,
        expiresIn: jwtConfig.accessTokenExpiry,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );

    return accessToken;
  } catch (error) {
    throw new Error('Failed to refresh access token: ' + error.message);
  }
}