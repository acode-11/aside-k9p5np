import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import request from 'supertest';
import { MockOAuth2Client } from '@google-auth/oauth2client';
import AuthService from '../src/services/auth.service';
import UserModel, { UserRole } from '../src/models/user.model';
import { TokenUtils } from '../src/utils/token.utils';
import { AUTH_CONFIG } from '../src/config/auth.config';

// Test data constants
const TEST_USER = {
  email: 'test@example.com',
  password: 'StrongPass123!',
  firstName: 'Test',
  lastName: 'User'
};

const INVALID_USER = {
  email: 'invalid@example.com',
  password: 'weak',
  firstName: '',
  lastName: ''
};

// Mock configurations
jest.mock('@google-auth/oauth2client');
jest.mock('rate-limiter-flexible');
jest.mock('ioredis');

describe('Authentication Service Tests', () => {
  let mongoContainer: StartedTestContainer;
  let authService: typeof AuthService;
  let mockOAuthClient: jest.Mocked<MockOAuth2Client>;

  // Test suite setup
  beforeAll(async () => {
    // Start MongoDB test container
    mongoContainer = await new GenericContainer('mongo:5.0')
      .withExposedPorts(27017)
      .withEnvironment({
        MONGO_INITDB_ROOT_USERNAME: 'test',
        MONGO_INITDB_ROOT_PASSWORD: 'test'
      })
      .start();

    // Configure test database connection
    const mongoPort = mongoContainer.getMappedPort(27017);
    process.env.MONGODB_URI = `mongodb://test:test@localhost:${mongoPort}`;

    // Initialize auth service with test configuration
    authService = new AuthService();

    // Configure mock OAuth client
    mockOAuthClient = new MockOAuth2Client() as jest.Mocked<MockOAuth2Client>;
  });

  // Cleanup after all tests
  afterAll(async () => {
    await mongoContainer.stop();
    await UserModel.deleteMany({});
  });

  // Reset state before each test
  beforeEach(async () => {
    await UserModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    test('should successfully register new user with valid data', async () => {
      const result = await authService.registerUser(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.firstName,
        TEST_USER.lastName
      );

      expect(result).toBeDefined();
      expect(result.email).toBe(TEST_USER.email);
      expect(result.role).toBe(UserRole.READER);
      expect(result.password).not.toBe(TEST_USER.password); // Password should be hashed
    });

    test('should reject registration with existing email', async () => {
      // First registration
      await authService.registerUser(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.firstName,
        TEST_USER.lastName
      );

      // Attempt duplicate registration
      await expect(
        authService.registerUser(
          TEST_USER.email,
          TEST_USER.password,
          TEST_USER.firstName,
          TEST_USER.lastName
        )
      ).rejects.toThrow('Email already exists');
    });

    test('should reject registration with invalid password format', async () => {
      await expect(
        authService.registerUser(
          TEST_USER.email,
          INVALID_USER.password,
          TEST_USER.firstName,
          TEST_USER.lastName
        )
      ).rejects.toThrow('Password does not meet security requirements');
    });

    test('should enforce password complexity requirements', async () => {
      const testCases = [
        'short123!', // Too short
        'nouppercase123!', // No uppercase
        'NOLOWERCASE123!', // No lowercase
        'NoSpecialChars123', // No special chars
        'NoNumbers!', // No numbers
      ];

      for (const password of testCases) {
        await expect(
          authService.registerUser(
            TEST_USER.email,
            password,
            TEST_USER.firstName,
            TEST_USER.lastName
          )
        ).rejects.toThrow('Password does not meet security requirements');
      }
    });
  });

  describe('User Authentication', () => {
    beforeEach(async () => {
      // Create test user for authentication tests
      await authService.registerUser(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.firstName,
        TEST_USER.lastName
      );
    });

    test('should successfully login with valid credentials', async () => {
      const result = await authService.loginUser(
        TEST_USER.email,
        TEST_USER.password
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.tokenType).toBe('Bearer');
    });

    test('should reject login with invalid password', async () => {
      await expect(
        authService.loginUser(TEST_USER.email, 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should increment and track failed login attempts', async () => {
      const maxAttempts = AUTH_CONFIG.security.maxLoginAttempts;
      
      for (let i = 0; i < maxAttempts; i++) {
        await expect(
          authService.loginUser(TEST_USER.email, 'wrongpassword')
        ).rejects.toThrow('Invalid credentials');
      }

      // Next attempt should trigger lockout
      await expect(
        authService.loginUser(TEST_USER.email, TEST_USER.password)
      ).rejects.toThrow('Account temporarily locked');
    });

    test('should enforce MFA when enabled', async () => {
      // Enable MFA for test user
      const mfaSecret = await authService.setupMFA(TEST_USER.email);
      expect(mfaSecret).toBeDefined();

      // Attempt login without MFA token
      await expect(
        authService.loginUser(TEST_USER.email, TEST_USER.password)
      ).rejects.toThrow('MFA token required');

      // Attempt login with invalid MFA token
      await expect(
        authService.loginUser(TEST_USER.email, TEST_USER.password, '000000')
      ).rejects.toThrow('Invalid MFA token');
    });
  });

  describe('OAuth Authentication', () => {
    test('should handle Google OAuth authentication', async () => {
      const mockGoogleToken = 'mock_google_token';
      const mockUserInfo = {
        email: 'google@example.com',
        given_name: 'Google',
        family_name: 'User'
      };

      mockOAuthClient.getToken.mockResolvedValue({
        tokens: { id_token: mockGoogleToken }
      });
      mockOAuthClient.verifyIdToken.mockResolvedValue({
        getPayload: () => mockUserInfo
      });

      const result = await authService.handleOAuthCallback(
        'GOOGLE',
        'mock_code',
        'mock_state'
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    test('should handle GitHub OAuth authentication', async () => {
      const mockGithubToken = 'mock_github_token';
      const mockUserInfo = {
        email: 'github@example.com',
        name: 'GitHub User'
      };

      // Mock GitHub API responses
      jest.spyOn(authService['_githubClient'].oauth, 'createToken')
        .mockResolvedValue({ data: { access_token: mockGithubToken } });
      jest.spyOn(authService['_githubClient'].users, 'getAuthenticated')
        .mockResolvedValue({ data: mockUserInfo });

      const result = await authService.handleOAuthCallback(
        'GITHUB',
        'mock_code',
        'mock_state'
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('Token Management', () => {
    let userTokens: { accessToken: string; refreshToken: string };

    beforeEach(async () => {
      // Create user and get tokens
      await authService.registerUser(
        TEST_USER.email,
        TEST_USER.password,
        TEST_USER.firstName,
        TEST_USER.lastName
      );
      userTokens = await authService.loginUser(
        TEST_USER.email,
        TEST_USER.password
      );
    });

    test('should validate access token', async () => {
      const decoded = await TokenUtils.verifyToken(userTokens.accessToken, {
        purpose: 'access'
      });

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBeDefined();
      expect(decoded.purpose).toBe('access');
    });

    test('should refresh access token with valid refresh token', async () => {
      const newAccessToken = await TokenUtils.refreshAccessToken(
        userTokens.refreshToken
      );

      expect(newAccessToken).toBeDefined();
      expect(newAccessToken).not.toBe(userTokens.accessToken);

      // Verify new token
      const decoded = await TokenUtils.verifyToken(newAccessToken, {
        purpose: 'access'
      });
      expect(decoded.purpose).toBe('access');
    });
  });
});