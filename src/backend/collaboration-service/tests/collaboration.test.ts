import { describe, it, beforeEach, afterEach, expect, jest } from 'jest'; // v29.7.0
import { mock, MockInstance, spyOn } from 'jest'; // v29.7.0
import WebSocket from 'ws'; // v8.14.2

import { CollaborationController } from '../src/controllers/collaboration.controller';
import { RealtimeService, REALTIME_EVENTS } from '../src/services/realtime.service';
import { WebSocketManager, SOCKET_EVENTS } from '../utils/socket.utils';
import { ICommunity, CommunityType, CommunityVisibility } from '../src/models/community.model';
import { getWebSocketConfig } from '../src/config/websocket.config';

// Mock implementations
jest.mock('../src/services/realtime.service');
jest.mock('../utils/socket.utils');
jest.mock('../src/config/websocket.config');

describe('CollaborationService Tests', () => {
  let collaborationController: CollaborationController;
  let realtimeService: jest.Mocked<RealtimeService>;
  let wsManager: jest.Mocked<WebSocketManager>;
  let mockWebSocket: jest.Mocked<WebSocket>;
  let mockLogger: any;
  let mockMetricsCollector: any;
  let mockRateLimiter: any;

  const testUserId = 'test-user-123';
  const testOrgId = 'test-org-456';
  const testCommunityId = 'test-community-789';

  beforeEach(async () => {
    // Initialize mocks
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };

    mockMetricsCollector = {
      registerMetric: jest.fn(),
      getMetric: jest.fn().mockReturnValue({
        inc: jest.fn(),
        dec: jest.fn(),
        observe: jest.fn()
      })
    };

    mockRateLimiter = {
      consume: jest.fn().mockResolvedValue(true)
    };

    mockWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn(),
      readyState: WebSocket.OPEN
    } as unknown as jest.Mocked<WebSocket>;

    // Initialize services
    realtimeService = new RealtimeService(wsManager, mockLogger, getWebSocketConfig()) as jest.Mocked<RealtimeService>;
    wsManager = new WebSocketManager(getWebSocketConfig(), mockLogger) as jest.Mocked<WebSocketManager>;

    // Initialize controller
    collaborationController = new CollaborationController(
      realtimeService,
      mockLogger,
      mockRateLimiter,
      mockMetricsCollector,
      wsManager
    );

    // Clear all metrics
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Community Management', () => {
    it('should create a new community with valid data', async () => {
      const communityData = {
        name: 'Test Community',
        description: 'Test Description',
        type: CommunityType.PUBLIC,
        visibility: CommunityVisibility.PUBLIC,
        settings: {
          allowMemberInvites: true,
          requireMemberApproval: false
        }
      };

      // Test community creation
      const result = await collaborationController.createCommunity(communityData);

      // Verify rate limiting check
      expect(mockRateLimiter.consume).toHaveBeenCalledWith('create_community', 1);

      // Verify metrics collection
      expect(mockMetricsCollector.getMetric).toHaveBeenCalledWith('community_creations_total');
      expect(mockMetricsCollector.getMetric('community_creations_total').inc).toHaveBeenCalled();

      // Verify realtime broadcast
      expect(realtimeService.broadcastToCommunity).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: REALTIME_EVENTS.COMMUNITY_UPDATE,
          payload: expect.objectContaining({ action: 'create' })
        })
      );

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Community created successfully',
        expect.any(Object)
      );
    });

    it('should reject community creation with invalid data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        description: 'Test',
        type: 'INVALID_TYPE',
        visibility: CommunityVisibility.PUBLIC,
        settings: {}
      };

      await expect(collaborationController.createCommunity(invalidData))
        .rejects.toThrow('Invalid community name length');
    });
  });

  describe('WebSocket Connection Management', () => {
    it('should handle new WebSocket connections correctly', async () => {
      const connectionInfo = {
        userId: testUserId,
        organizationId: testOrgId,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        origin: 'http://localhost:3000'
      };

      await collaborationController.handleWebSocketConnection(mockWebSocket, connectionInfo);

      // Verify rate limiting
      expect(mockRateLimiter.consume).toHaveBeenCalledWith(
        `ws_connection_${testUserId}`,
        1
      );

      // Verify client connection handling
      expect(realtimeService.handleClientConnection).toHaveBeenCalledWith(
        expect.any(String),
        connectionInfo
      );

      // Verify metrics
      expect(mockMetricsCollector.getMetric('active_websocket_connections').inc)
        .toHaveBeenCalled();

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WebSocket connection established',
        expect.any(Object)
      );
    });

    it('should handle WebSocket connection errors correctly', async () => {
      const connectionInfo = {
        userId: testUserId,
        organizationId: testOrgId,
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        origin: 'invalid-origin'
      };

      // Mock rate limiter to reject
      mockRateLimiter.consume.mockRejectedValueOnce(new Error('Rate limit exceeded'));

      await collaborationController.handleWebSocketConnection(mockWebSocket, connectionInfo);

      // Verify socket closure
      expect(mockWebSocket.close).toHaveBeenCalledWith(
        1008,
        'Connection initialization failed'
      );

      // Verify error logging
      expect(mockLogger.error).toHaveBeenCalledWith(
        'WebSocket connection failed:',
        expect.any(Error)
      );
    });
  });

  describe('Real-time Communication', () => {
    it('should handle real-time message broadcasting', async () => {
      const message = {
        type: REALTIME_EVENTS.COMMUNITY_UPDATE,
        payload: { action: 'update', data: {} },
        timestamp: new Date()
      };

      await realtimeService.broadcastToCommunity(testCommunityId, message);

      // Verify broadcast handling
      expect(wsManager.broadcastMessage).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          type: REALTIME_EVENTS.COMMUNITY_UPDATE,
          payload: expect.any(Object)
        })
      );
    });

    it('should handle connection health monitoring', async () => {
      const clientId = `${testUserId}-${Date.now()}`;
      const metrics = {
        messageCount: 0,
        errors: [],
        lastActivity: new Date()
      };

      // Simulate message activity
      mockWebSocket.on.mockImplementation((event, callback) => {
        if (event === SOCKET_EVENTS.MESSAGE) {
          callback();
        }
      });

      // Monitor connection
      collaborationController['monitorConnection'](clientId, mockWebSocket);

      // Verify metrics update
      expect(mockMetricsCollector.getMetric('active_websocket_connections'))
        .toHaveBeenCalled();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track connection metrics correctly', async () => {
      const clientId = `${testUserId}-${Date.now()}`;

      // Initialize connection metrics
      collaborationController['initializeConnectionMetrics'](clientId);

      // Verify metrics initialization
      const metrics = collaborationController['connectionMetrics'].get(clientId);
      expect(metrics).toBeDefined();
      expect(metrics).toMatchObject({
        connectedAt: expect.any(Date),
        messageCount: 0,
        errors: [],
        lastActivity: expect.any(Date)
      });
    });

    it('should update metrics on activity', async () => {
      const clientId = `${testUserId}-${Date.now()}`;

      // Initialize and update metrics
      collaborationController['initializeConnectionMetrics'](clientId);
      collaborationController['updateConnectionMetrics'](clientId);

      // Verify metrics update
      const metrics = collaborationController['connectionMetrics'].get(clientId);
      expect(metrics?.lastActivity).toBeInstanceOf(Date);
    });
  });
});