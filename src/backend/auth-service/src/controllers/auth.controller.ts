import { 
  Controller, 
  Post, 
  Body, 
  UseGuards,
  Headers,
  Req,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException
} from '@nestjs/common'; // v10.0.0
import { GrpcMethod } from '@nestjs/microservices'; // v10.0.0
import { AuthService } from '../services/auth.service';
import { IUser, UserRole } from '../models/user.model';
import { AUTH_CONFIG } from '../config/auth.config';
import { Request } from 'express';

// Request/Response interfaces
interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  deviceFingerprint?: string;
}

interface LoginRequest {
  email: string;
  password: string;
  mfaToken?: string;
  deviceFingerprint?: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  mfaRequired?: boolean;
}

interface OAuthCallbackRequest {
  provider: string;
  code: string;
  state: string;
}

/**
 * Enhanced authentication controller with comprehensive security controls
 */
@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly _authService: AuthService) {}

  /**
   * User registration endpoint with enhanced security validation
   */
  @Post('register')
  @GrpcMethod('AuthService')
  @UseGuards(RegistrationValidationGuard)
  async register(
    @Body() request: RegisterRequest,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request
  ): Promise<IUser> {
    try {
      // Enhanced input validation
      this.validateRegistrationInput(request);

      // Get client IP for security tracking
      const clientIp = req.ip || req.connection.remoteAddress;

      // Generate device fingerprint if not provided
      const deviceFingerprint = request.deviceFingerprint || this.generateDeviceFingerprint({
        userAgent,
        ipAddress: clientIp,
        timestamp: Date.now()
      });

      // Register user with enhanced security
      const user = await this._authService.registerUser(
        request.email,
        request.password,
        request.firstName,
        request.lastName
      );

      // Track registration event for security monitoring
      await this._authService.trackSecurityEvent('user_registration', {
        userId: user.id,
        deviceFingerprint,
        ipAddress: clientIp,
        userAgent
      });

      return user;
    } catch (error) {
      this.handleAuthError(error, 'Registration failed');
    }
  }

  /**
   * User login endpoint with comprehensive security controls
   */
  @Post('login')
  @GrpcMethod('AuthService')
  @UseGuards(LoginRateLimitGuard)
  async login(
    @Body() request: LoginRequest,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request
  ): Promise<TokenResponse> {
    try {
      // Enhanced input validation
      this.validateLoginInput(request);

      const clientIp = req.ip || req.connection.remoteAddress;

      // Validate device fingerprint
      const deviceFingerprint = await this._authService.validateDeviceFingerprint(
        request.deviceFingerprint || this.generateDeviceFingerprint({
          userAgent,
          ipAddress: clientIp,
          timestamp: Date.now()
        })
      );

      // Track login attempt for security monitoring
      await this._authService.trackLoginAttempt(request.email, {
        success: false,
        deviceFingerprint,
        ipAddress: clientIp,
        userAgent
      });

      // Attempt login with enhanced security
      const tokens = await this._authService.loginUser(
        request.email,
        request.password,
        request.mfaToken,
        deviceFingerprint
      );

      // Update login tracking on success
      await this._authService.trackLoginAttempt(request.email, {
        success: true,
        deviceFingerprint,
        ipAddress: clientIp,
        userAgent
      });

      return tokens;
    } catch (error) {
      this.handleAuthError(error, 'Login failed');
    }
  }

  /**
   * OAuth callback handler with enhanced security
   */
  @Post('oauth/callback')
  async handleOAuthCallback(
    @Body() request: OAuthCallbackRequest,
    @Headers('user-agent') userAgent: string,
    @Req() req: Request
  ): Promise<TokenResponse> {
    try {
      // Validate OAuth state to prevent CSRF
      if (!request.state || !await this._authService.validateOAuthState(request.state)) {
        throw new UnauthorizedException('Invalid OAuth state');
      }

      const clientIp = req.ip || req.connection.remoteAddress;

      // Process OAuth callback with security tracking
      const tokens = await this._authService.handleOAuthCallback(
        request.provider,
        request.code,
        request.state
      );

      // Track successful OAuth login
      await this._authService.trackSecurityEvent('oauth_login', {
        provider: request.provider,
        ipAddress: clientIp,
        userAgent
      });

      return tokens;
    } catch (error) {
      this.handleAuthError(error, 'OAuth authentication failed');
    }
  }

  /**
   * MFA setup endpoint with enhanced security
   */
  @Post('mfa/setup')
  @UseGuards(AuthGuard)
  async setupMFA(
    @Req() req: Request
  ): Promise<{ otpAuthUrl: string }> {
    try {
      const userId = req.user.id;
      const otpAuthUrl = await this._authService.setupMFA(userId);

      return { otpAuthUrl };
    } catch (error) {
      this.handleAuthError(error, 'MFA setup failed');
    }
  }

  /**
   * Logout endpoint with enhanced security
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(
    @Req() req: Request
  ): Promise<void> {
    try {
      const userId = req.user.id;
      const sessionId = req.headers.authorization?.split(' ')[1];

      if (!sessionId) {
        throw new UnauthorizedException('Invalid session');
      }

      await this._authService.logoutUser(userId, sessionId);

      // Track logout event
      await this._authService.trackSecurityEvent('logout', {
        userId,
        sessionId,
        ipAddress: req.ip
      });
    } catch (error) {
      this.handleAuthError(error, 'Logout failed');
    }
  }

  /**
   * Private helper methods
   */
  private validateRegistrationInput(request: RegisterRequest): void {
    const { email, password, firstName, lastName } = request;

    if (!email?.match(AUTH_CONFIG.validation.emailRegex)) {
      throw new BadRequestException('Invalid email format');
    }

    if (!password || password.length < AUTH_CONFIG.security.passwordMinLength) {
      throw new BadRequestException('Invalid password');
    }

    if (!firstName?.trim() || !lastName?.trim()) {
      throw new BadRequestException('Invalid name');
    }
  }

  private validateLoginInput(request: LoginRequest): void {
    const { email, password } = request;

    if (!email?.trim() || !password?.trim()) {
      throw new BadRequestException('Invalid credentials');
    }
  }

  private generateDeviceFingerprint(data: {
    userAgent: string;
    ipAddress: string;
    timestamp: number;
  }): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private handleAuthError(error: any, defaultMessage: string): never {
    if (error instanceof UnauthorizedException) {
      throw error;
    }
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    console.error('Authentication error:', error);
    throw new InternalServerErrorException(defaultMessage);
  }
}