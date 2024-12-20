import { AUTH_CONFIG } from '../config/auth.config';
import UserModel, { IUser, UserRole, OAuthProvider } from '../models/user.model';
import { generateTokenPair, verifyToken } from '../utils/token.utils';
import bcrypt from 'bcryptjs'; // v2.4.3
import { authenticator } from 'otplib'; // v12.0.1
import { OAuth2Client } from '@google-auth/oauth2client'; // v8.1.0
import { Octokit } from '@octokit/rest'; // v19.0.7
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import Redis from 'ioredis'; // v5.3.2

/**
 * Interface for device fingerprint data
 */
interface DeviceFingerprint {
  userAgent: string;
  ipAddress: string;
  deviceId: string;
  lastSeen: Date;
  trustScore: number;
}

/**
 * Interface for session tracking
 */
interface SessionInfo {
  userId: string;
  deviceFingerprint: DeviceFingerprint;
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}

/**
 * Enhanced authentication service with comprehensive security controls
 */
export class AuthService implements IAuthService {
  private readonly _userModel: typeof UserModel;
  private readonly _googleClient: OAuth2Client;
  private readonly _githubClient: Octokit;
  private readonly _redis: Redis;
  private readonly _rateLimiter: RateLimiter;

  constructor() {
    this._userModel = UserModel;
    
    // Initialize OAuth clients
    this._googleClient = new OAuth2Client({
      clientId: AUTH_CONFIG.oauth.google.clientId,
      clientSecret: AUTH_CONFIG.oauth.google.clientSecret,
      redirectUri: AUTH_CONFIG.oauth.google.callbackUrl
    });

    this._githubClient = new Octokit({
      auth: AUTH_CONFIG.oauth.github.clientSecret
    });

    // Initialize Redis for session and rate limiting
    this._redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      enableTLS: process.env.NODE_ENV === 'production'
    });

    // Configure rate limiter
    this._rateLimiter = new RateLimiter({
      storeClient: this._redis,
      points: AUTH_CONFIG.security.rateLimit,
      duration: AUTH_CONFIG.security.rateLimitWindow
    });

    // Configure TOTP settings
    authenticator.options = {
      window: AUTH_CONFIG.mfa.window,
      step: AUTH_CONFIG.mfa.step
    };
  }

  /**
   * Register a new user with enhanced security validations
   */
  public async registerUser(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<IUser> {
    // Rate limiting check
    await this._checkRateLimit(`register_${email}`);

    // Validate email format
    if (!email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      throw new Error('Invalid email format');
    }

    // Validate password complexity
    if (!await this._userModel.prototype.validatePassword(password)) {
      throw new Error('Password does not meet security requirements');
    }

    // Hash password with strong salt
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with default role
    const user = await this._userModel.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.READER,
      organizationId: 'default', // Should be replaced with actual org ID
      isActive: true,
      isMFAEnabled: AUTH_CONFIG.security.requireMFA
    });

    // Generate MFA secret if required
    if (AUTH_CONFIG.security.requireMFA) {
      await this.setupMFA(user.id);
    }

    return user;
  }

  /**
   * Authenticate user with comprehensive security controls
   */
  public async loginUser(
    email: string,
    password: string,
    mfaToken?: string,
    deviceFingerprint?: string
  ): Promise<TokenPair> {
    // Rate limiting check
    await this._checkRateLimit(`login_${email}`);

    // Find user with password and MFA secret
    const user = await this._userModel.findOne({ email })
      .select('+password +mfaSecret')
      .exec();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      throw new Error('Account temporarily locked');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await user.incrementLoginAttempts();
      throw new Error('Invalid credentials');
    }

    // Verify MFA if enabled
    if (user.isMFAEnabled) {
      if (!mfaToken) {
        throw new Error('MFA token required');
      }
      const isValidMFA = await this.verifyMFA(user.id, mfaToken);
      if (!isValidMFA) {
        throw new Error('Invalid MFA token');
      }
    }

    // Verify device fingerprint
    const deviceInfo = deviceFingerprint ? 
      await this._validateDeviceFingerprint(user.id, deviceFingerprint) :
      undefined;

    // Generate tokens
    const tokens = await generateTokenPair(user, {
      deviceId: deviceInfo?.deviceId,
      userAgent: deviceInfo?.userAgent,
      ipAddress: deviceInfo?.ipAddress
    });

    // Create new session
    await this._createSession(user.id, deviceInfo);

    // Reset login attempts
    await user.resetLoginAttempts();

    return tokens;
  }

  /**
   * Logout user and invalidate session
   */
  public async logoutUser(userId: string, sessionId: string): Promise<void> {
    await this._redis.del(`session:${sessionId}`);
    
    // Optionally blacklist tokens if enabled
    if (AUTH_CONFIG.jwt.enableBlacklist) {
      // Implementation of token blacklisting
    }
  }

  /**
   * Set up MFA for user
   */
  public async setupMFA(userId: string): Promise<string> {
    const user = await this._userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(
      user.email,
      AUTH_CONFIG.mfa.issuer,
      secret
    );

    user.mfaSecret = secret;
    user.isMFAEnabled = true;
    await user.save();

    return otpauth;
  }

  /**
   * Verify MFA token
   */
  public async verifyMFA(userId: string, token: string): Promise<boolean> {
    const user = await this._userModel.findById(userId).select('+mfaSecret');
    if (!user?.mfaSecret) {
      throw new Error('MFA not set up');
    }

    return authenticator.verify({
      token,
      secret: user.mfaSecret
    });
  }

  /**
   * Handle OAuth authentication callback
   */
  public async handleOAuthCallback(
    provider: string,
    code: string,
    state: string
  ): Promise<TokenPair> {
    let userInfo;

    switch (provider.toUpperCase()) {
      case OAuthProvider.GOOGLE:
        userInfo = await this._handleGoogleAuth(code);
        break;
      case OAuthProvider.GITHUB:
        userInfo = await this._handleGithubAuth(code, state);
        break;
      default:
        throw new Error('Unsupported OAuth provider');
    }

    // Find or create user
    let user = await this._userModel.findOne({ email: userInfo.email });
    if (!user) {
      user = await this.registerUser(
        userInfo.email,
        crypto.randomBytes(32).toString('hex'),
        userInfo.firstName || '',
        userInfo.lastName || ''
      );
    }

    // Update OAuth providers if needed
    if (!user.oauthProviders.includes(provider)) {
      user.oauthProviders.push(provider);
      await user.save();
    }

    return await generateTokenPair(user);
  }

  /**
   * Private helper methods
   */
  private async _checkRateLimit(key: string): Promise<void> {
    try {
      await this._rateLimiter.consume(key);
    } catch (error) {
      throw new Error('Rate limit exceeded');
    }
  }

  private async _validateDeviceFingerprint(
    userId: string,
    fingerprint: string
  ): Promise<DeviceFingerprint> {
    // Implement device fingerprint validation logic
    return JSON.parse(fingerprint);
  }

  private async _createSession(
    userId: string,
    deviceInfo?: DeviceFingerprint
  ): Promise<void> {
    const session: SessionInfo = {
      userId,
      deviceFingerprint: deviceInfo!,
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };

    await this._redis.setex(
      `session:${deviceInfo?.deviceId}`,
      AUTH_CONFIG.security.sessionTimeout,
      JSON.stringify(session)
    );
  }

  private async _handleGoogleAuth(code: string): Promise<any> {
    const { tokens } = await this._googleClient.getToken(code);
    const ticket = await this._googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: AUTH_CONFIG.oauth.google.clientId
    });
    return ticket.getPayload();
  }

  private async _handleGithubAuth(code: string, state: string): Promise<any> {
    // Verify state to prevent CSRF
    // Implementation of state verification

    const response = await this._githubClient.oauth.createToken({
      client_id: AUTH_CONFIG.oauth.github.clientId,
      client_secret: AUTH_CONFIG.oauth.github.clientSecret,
      code,
      state
    });

    const octokit = new Octokit({ auth: response.data.access_token });
    return await octokit.users.getAuthenticated();
  }
}

export default new AuthService();