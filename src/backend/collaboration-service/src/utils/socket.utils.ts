import WebSocket from 'ws'; // v8.14.2
import { injectable } from 'inversify'; // v6.0.1
import { Logger } from 'winston'; // v3.10.0
import { WebSocketConfig } from '../config/websocket.config';

/**
 * WebSocket event type constants
 * @version 1.0.0
 */
export const SOCKET_EVENTS = {
  CONNECT: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  HEARTBEAT: 'heartbeat',
  MESSAGE: 'message',
  BROADCAST: 'broadcast'
} as const;

/**
 * Connection metrics interface for monitoring WebSocket performance
 */
interface ConnectionMetrics {
  clientId: string;
  connectedAt: Date;
  lastHeartbeat: Date;
  messageCount: number;
  latency: number[];
  errors: Error[];
}

/**
 * Message delivery options for broadcast operations
 */
interface BroadcastOptions {
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
  timeout?: number;
  compress?: boolean;
}

/**
 * Result of broadcast operation including delivery status
 */
interface BroadcastResult {
  successful: string[];
  failed: { clientId: string; reason: string }[];
  latency: number;
}

/**
 * Security context for WebSocket connections
 */
interface SecurityContext {
  token: string;
  permissions: string[];
  origin: string;
  clientCert?: string;
}

/**
 * Enhanced WebSocket connection manager with advanced monitoring and security features
 * @class WebSocketManager
 * @version 1.0.0
 */
@injectable()
export class WebSocketManager {
  private connections: Map<string, WebSocket>;
  private metrics: Map<string, ConnectionMetrics>;
  private heartbeatIntervals: Map<string, NodeJS.Timer>;
  private rateLimitCounters: Map<string, number>;
  private readonly rateLimitResetInterval: NodeJS.Timer;

  constructor(
    private readonly config: WebSocketConfig,
    private readonly logger: Logger
  ) {
    this.connections = new Map();
    this.metrics = new Map();
    this.heartbeatIntervals = new Map();
    this.rateLimitCounters = new Map();

    // Reset rate limit counters periodically
    this.rateLimitResetInterval = setInterval(() => {
      this.rateLimitCounters.clear();
    }, 60000); // Reset every minute
  }

  /**
   * Creates an enhanced heartbeat mechanism for connection health monitoring
   * @param socket WebSocket connection
   * @param clientId Client identifier
   * @returns Heartbeat interval timer
   */
  private createHeartbeat(socket: WebSocket, clientId: string): NodeJS.Timer {
    let missedHeartbeats = 0;
    const maxMissedHeartbeats = 3;

    return setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        const startTime = Date.now();
        
        socket.ping(undefined, undefined, (err) => {
          if (err) {
            this.logger.error(`Heartbeat error for client ${clientId}:`, err);
            missedHeartbeats++;
          } else {
            const latency = Date.now() - startTime;
            const metrics = this.metrics.get(clientId);
            if (metrics) {
              metrics.latency.push(latency);
              metrics.lastHeartbeat = new Date();
              missedHeartbeats = 0;
            }
          }

          // Handle disconnection after max missed heartbeats
          if (missedHeartbeats >= maxMissedHeartbeats) {
            this.logger.warn(`Client ${clientId} exceeded max missed heartbeats, disconnecting`);
            this.removeConnection(clientId);
          }
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Validates incoming WebSocket connection request
   * @param clientId Client identifier
   * @param context Security context
   * @returns boolean indicating if connection is valid
   */
  private validateConnection(clientId: string, context: SecurityContext): boolean {
    // Check connection pool capacity
    if (this.connections.size >= this.config.maxConnections) {
      this.logger.warn(`Connection rejected: Max connections (${this.config.maxConnections}) reached`);
      return false;
    }

    // Validate origin
    if (!this.config.allowedOrigins.includes(context.origin)) {
      this.logger.warn(`Connection rejected: Invalid origin ${context.origin}`);
      return false;
    }

    // Check rate limiting
    const clientRequests = this.rateLimitCounters.get(clientId) || 0;
    if (clientRequests >= this.config.maxConnections) {
      this.logger.warn(`Connection rejected: Rate limit exceeded for client ${clientId}`);
      return false;
    }
    this.rateLimitCounters.set(clientId, clientRequests + 1);

    return true;
  }

  /**
   * Adds new WebSocket connection with enhanced security and monitoring
   * @param clientId Client identifier
   * @param socket WebSocket connection
   * @param context Security context
   */
  public addConnection(clientId: string, socket: WebSocket, context: SecurityContext): void {
    if (!this.validateConnection(clientId, context)) {
      socket.close(1008, 'Connection validation failed');
      return;
    }

    // Initialize connection metrics
    const metrics: ConnectionMetrics = {
      clientId,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
      messageCount: 0,
      latency: [],
      errors: []
    };

    // Set up connection monitoring
    this.connections.set(clientId, socket);
    this.metrics.set(clientId, metrics);

    // Initialize heartbeat monitoring
    const heartbeatInterval = this.createHeartbeat(socket, clientId);
    this.heartbeatIntervals.set(clientId, heartbeatInterval);

    // Set up error handling
    socket.on('error', (error: Error) => {
      this.logger.error(`WebSocket error for client ${clientId}:`, error);
      metrics.errors.push(error);
    });

    this.logger.info(`Client ${clientId} connected successfully`);
  }

  /**
   * Removes WebSocket connection with cleanup and metrics archival
   * @param clientId Client identifier
   */
  public removeConnection(clientId: string): void {
    const socket = this.connections.get(clientId);
    if (socket) {
      // Clear heartbeat interval
      const heartbeatInterval = this.heartbeatIntervals.get(clientId);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        this.heartbeatIntervals.delete(clientId);
      }

      // Archive metrics before removal
      const metrics = this.metrics.get(clientId);
      if (metrics) {
        this.logger.info(`Client ${clientId} disconnected. Metrics:`, {
          duration: new Date().getTime() - metrics.connectedAt.getTime(),
          messageCount: metrics.messageCount,
          averageLatency: metrics.latency.reduce((a, b) => a + b, 0) / metrics.latency.length,
          errorCount: metrics.errors.length
        });
      }

      // Clean up connection
      socket.terminate();
      this.connections.delete(clientId);
      this.metrics.delete(clientId);
    }
  }

  /**
   * Broadcasts message to specified clients with delivery guarantees
   * @param clientIds Array of client identifiers
   * @param message Message to broadcast
   * @param options Broadcast options
   * @returns Broadcast result with delivery status
   */
  public async broadcastMessage(
    clientIds: string[],
    message: any,
    options: BroadcastOptions = {}
  ): Promise<BroadcastResult> {
    const result: BroadcastResult = {
      successful: [],
      failed: [],
      latency: 0
    };

    const startTime = Date.now();
    const promises = clientIds.map(async (clientId) => {
      const socket = this.connections.get(clientId);
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        result.failed.push({ clientId, reason: 'Client not connected' });
        return;
      }

      try {
        const data = options.compress ? 
          JSON.stringify(message) : 
          message;

        await new Promise<void>((resolve, reject) => {
          socket.send(data, (error) => {
            if (error) {
              reject(error);
            } else {
              const metrics = this.metrics.get(clientId);
              if (metrics) {
                metrics.messageCount++;
              }
              result.successful.push(clientId);
              resolve();
            }
          });
        });
      } catch (error) {
        result.failed.push({ 
          clientId, 
          reason: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    await Promise.all(promises);
    result.latency = Date.now() - startTime;

    this.logger.debug('Broadcast complete', {
      successCount: result.successful.length,
      failureCount: result.failed.length,
      latency: result.latency
    });

    return result;
  }

  /**
   * Cleanup resources on service shutdown
   */
  public dispose(): void {
    clearInterval(this.rateLimitResetInterval);
    
    // Clean up all connections
    for (const clientId of this.connections.keys()) {
      this.removeConnection(clientId);
    }

    this.logger.info('WebSocket manager disposed successfully');
  }
}