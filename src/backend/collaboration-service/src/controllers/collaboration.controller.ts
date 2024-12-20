import { injectable } from 'inversify'; // v6.0.1
import { controller, post, ws, authorize, validate } from 'routing-controllers'; // v0.10.4
import { Logger } from 'winston'; // v3.10.0
import { RateLimiter } from 'rate-limiter-flexible'; // v2.4.1
import { MetricsCollector } from 'prom-client'; // v14.2.0

import { ICommunity, CommunityType, IMember } from '../models/community.model';
import { RealtimeService, REALTIME_EVENTS } from '../services/realtime.service';
import { WebSocketManager, SOCKET_EVENTS } from '../utils/socket.utils';

/**
 * Interface for community creation request
 */
interface CreateCommunityDto {
  name: string;
  description: string;
  type: CommunityType;
  visibility: string;
  settings: any;
  tags?: string[];
}

/**
 * Interface for WebSocket connection info
 */
interface ConnectionInfo {
  userId: string;
  organizationId: string;
  ip: string;
  userAgent: string;
  origin: string;
}

/**
 * Enhanced collaboration controller with security, monitoring, and real-time features
 * @class CollaborationController
 * @version 1.0.0
 */
@injectable()
@controller('/api/v1/collaboration')
@authorize(['user', 'admin'])
export class CollaborationController {
  private readonly communityMetrics: Map<string, any>;
  private readonly connectionMetrics: Map<string, any>;

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly logger: Logger,
    private readonly rateLimiter: RateLimiter,
    private readonly metricsCollector: MetricsCollector,
    private readonly wsManager: WebSocketManager
  ) {
    this.communityMetrics = new Map();
    this.connectionMetrics = new Map();
    this.initializeMetrics();
  }

  /**
   * Initialize Prometheus metrics collectors
   */
  private initializeMetrics(): void {
    // Community metrics
    this.metricsCollector.registerMetric(new this.metricsCollector.Counter({
      name: 'community_creations_total',
      help: 'Total number of communities created'
    }));

    // WebSocket metrics
    this.metricsCollector.registerMetric(new this.metricsCollector.Gauge({
      name: 'active_websocket_connections',
      help: 'Number of active WebSocket connections'
    }));

    this.metricsCollector.registerMetric(new this.metricsCollector.Histogram({
      name: 'websocket_message_latency',
      help: 'WebSocket message latency in milliseconds',
      buckets: [10, 50, 100, 200, 500, 1000]
    }));
  }

  /**
   * Creates a new community with enhanced security and validation
   * @param communityData Community creation data
   * @returns Newly created community
   */
  @post('/communities')
  @validate()
  @authorize(['user', 'admin'])
  public async createCommunity(communityData: CreateCommunityDto): Promise<ICommunity> {
    try {
      // Rate limiting check
      await this.rateLimiter.consume('create_community', 1);

      // Validate community data
      this.validateCommunityData(communityData);

      // Create community logic would go here
      // This is a placeholder for the actual implementation
      const community = {} as ICommunity;

      // Update metrics
      this.metricsCollector.getMetric('community_creations_total').inc();
      this.updateCommunityMetrics(community.id);

      // Broadcast community creation event
      await this.realtimeService.broadcastToCommunity(community.id, {
        type: REALTIME_EVENTS.COMMUNITY_UPDATE,
        payload: { action: 'create', community },
        timestamp: new Date()
      });

      this.logger.info('Community created successfully', {
        communityId: community.id,
        type: community.type,
        creator: community.owner
      });

      return community;

    } catch (error) {
      this.logger.error('Failed to create community:', error);
      throw error;
    }
  }

  /**
   * Handles WebSocket connections with enhanced security and monitoring
   * @param socket WebSocket connection
   * @param connectionInfo Connection metadata
   */
  @ws('/ws')
  @authorize(['user', 'admin'])
  public async handleWebSocketConnection(socket: WebSocket, connectionInfo: ConnectionInfo): Promise<void> {
    const clientId = `${connectionInfo.userId}-${Date.now()}`;

    try {
      // Rate limiting check
      await this.rateLimiter.consume(`ws_connection_${connectionInfo.userId}`, 1);

      // Initialize connection with security context
      await this.realtimeService.handleClientConnection(clientId, connectionInfo);

      // Set up connection monitoring
      this.monitorConnection(clientId, socket);

      // Update metrics
      this.metricsCollector.getMetric('active_websocket_connections').inc();
      this.initializeConnectionMetrics(clientId);

      this.logger.info('WebSocket connection established', {
        clientId,
        userId: connectionInfo.userId,
        origin: connectionInfo.origin
      });

    } catch (error) {
      this.logger.error('WebSocket connection failed:', error);
      socket.close(1008, 'Connection initialization failed');
    }
  }

  /**
   * Validates community creation data
   * @param data Community creation data
   */
  private validateCommunityData(data: CreateCommunityDto): void {
    if (!data.name || data.name.length < 3 || data.name.length > 100) {
      throw new Error('Invalid community name length');
    }

    if (!data.description || data.description.length < 10 || data.description.length > 1000) {
      throw new Error('Invalid community description length');
    }

    if (!Object.values(CommunityType).includes(data.type)) {
      throw new Error('Invalid community type');
    }

    if (data.tags && (!Array.isArray(data.tags) || data.tags.some(tag => tag.length > 50))) {
      throw new Error('Invalid tags format');
    }
  }

  /**
   * Monitors WebSocket connection health
   * @param clientId Client identifier
   * @param socket WebSocket connection
   */
  private monitorConnection(clientId: string, socket: WebSocket): void {
    const metrics = this.connectionMetrics.get(clientId);

    socket.on(SOCKET_EVENTS.MESSAGE, () => {
      metrics.messageCount++;
      this.updateConnectionMetrics(clientId);
    });

    socket.on(SOCKET_EVENTS.ERROR, (error: Error) => {
      metrics.errors.push(error);
      this.logger.error('WebSocket error:', { clientId, error });
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      this.metricsCollector.getMetric('active_websocket_connections').dec();
      this.connectionMetrics.delete(clientId);
      this.logger.info('WebSocket connection closed', { clientId });
    });
  }

  /**
   * Initializes connection metrics
   * @param clientId Client identifier
   */
  private initializeConnectionMetrics(clientId: string): void {
    this.connectionMetrics.set(clientId, {
      connectedAt: Date.now(),
      messageCount: 0,
      errors: [],
      lastActivity: Date.now()
    });
  }

  /**
   * Updates connection metrics
   * @param clientId Client identifier
   */
  private updateConnectionMetrics(clientId: string): void {
    const metrics = this.connectionMetrics.get(clientId);
    if (metrics) {
      metrics.lastActivity = Date.now();
      this.connectionMetrics.set(clientId, metrics);
    }
  }

  /**
   * Updates community metrics
   * @param communityId Community identifier
   */
  private updateCommunityMetrics(communityId: string): void {
    const metrics = this.communityMetrics.get(communityId) || {
      createdAt: Date.now(),
      memberCount: 0,
      messageCount: 0,
      lastActivity: Date.now()
    };
    
    this.communityMetrics.set(communityId, metrics);
  }
}