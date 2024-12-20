/**
 * @fileoverview Enterprise-grade WebSocket service implementing secure real-time communication
 * with comprehensive connection lifecycle management, automatic reconnection, and error handling.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import EventEmitter from 'eventemitter3'; // v5.0.1
import { ApiError } from '../types/api.types';
import { getStoredToken } from '../utils/auth.utils';

/**
 * Configuration interface for WebSocket service
 */
export interface WebSocketConfig {
  url: string;
  autoReconnect: boolean;
  reconnectAttempts: number;
  reconnectInterval: number;
  pingInterval: number;
  maxBackoff: number;
  connectionTimeout: number;
  enableCompression: boolean;
  messageQueueSize: number;
}

/**
 * Interface for strongly typed WebSocket messages
 */
export interface WebSocketMessage {
  type: string;
  payload: any;
  id: string;
  timestamp: number;
  priority: number;
  requiresAck: boolean;
}

/**
 * Default WebSocket configuration
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  url: process.env.VITE_WS_URL || 'wss://api.detection-platform.com/ws',
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  pingInterval: 30000,
  maxBackoff: 32000,
  connectionTimeout: 10000,
  enableCompression: true,
  messageQueueSize: 100
};

/**
 * Enterprise-grade WebSocket service class implementing real-time communication
 */
export class WebSocketService extends EventEmitter {
  private socket: WebSocket | null = null;
  private config: WebSocketConfig;
  private isConnected: boolean = false;
  private reconnectCount: number = 0;
  private pingInterval: number | null = null;
  private reconnectTimeout: number | null = null;
  private messageQueue: Map<string, WebSocketMessage> = new Map();
  private pendingAcks: Set<string> = new Set();
  private connectionTimeout: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket service with configuration
   */
  constructor(config: Partial<WebSocketConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupMetricsCollection();
  }

  /**
   * Establish WebSocket connection with authentication
   */
  public async connect(): Promise<void> {
    try {
      if (this.socket?.readyState === WebSocket.OPEN) {
        return;
      }

      const token = await getStoredToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }

      this.socket = new WebSocket(this.config.url);
      
      // Set up connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.socket?.readyState !== WebSocket.OPEN) {
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);

      this.setupEventListeners();
      this.setupPingPong();

      if (this.config.enableCompression) {
        this.socket.binaryType = 'arraybuffer';
      }

      // Send authentication message
      this.socket.onopen = () => {
        this.send({
          type: 'AUTH',
          payload: { token },
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          priority: 1,
          requiresAck: true
        });
      };

    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * Send message through WebSocket connection
   */
  public send(message: WebSocketMessage): void {
    if (!this.isConnected) {
      if (this.messageQueue.size < this.config.messageQueueSize) {
        this.messageQueue.set(message.id, message);
      }
      return;
    }

    try {
      if (message.requiresAck) {
        this.pendingAcks.add(message.id);
      }

      this.socket?.send(JSON.stringify(message));
      this.emit('messageSent', message);
    } catch (error) {
      this.handleSendError(error, message);
    }
  }

  /**
   * Gracefully disconnect WebSocket connection
   */
  public async disconnect(): Promise<void> {
    this.clearTimers();
    this.isConnected = false;

    if (this.socket) {
      try {
        // Send disconnect message
        this.send({
          type: 'DISCONNECT',
          payload: { reason: 'Client initiated disconnect' },
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          priority: 1,
          requiresAck: false
        });

        this.socket.close(1000, 'Client disconnected');
        this.socket = null;
        this.emit('disconnected');
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
  }

  /**
   * Get current connection statistics
   */
  public getConnectionStats(): Record<string, any> {
    return {
      isConnected: this.isConnected,
      reconnectCount: this.reconnectCount,
      queueSize: this.messageQueue.size,
      pendingAcks: this.pendingAcks.size,
      lastPingTime: this.lastPingTime
    };
  }

  /**
   * Set up WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        if (message.type === 'ACK') {
          this.handleAcknowledgment(message);
        } else if (message.type === 'AUTH_SUCCESS') {
          this.handleAuthSuccess();
        } else {
          this.emit('message', message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.handleClose(event);
    };

    this.socket.onerror = (error: Event) => {
      this.handleConnectionError(error);
    };
  }

  /**
   * Handle successful authentication
   */
  private handleAuthSuccess(): void {
    this.isConnected = true;
    this.reconnectCount = 0;
    this.emit('connected');
    this.processMessageQueue();

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Process queued messages after reconnection
   */
  private processMessageQueue(): void {
    this.messageQueue.forEach((message) => {
      this.send(message);
    });
    this.messageQueue.clear();
  }

  /**
   * Set up ping/pong health check mechanism
   */
  private setupPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = window.setInterval(() => {
      if (this.isConnected) {
        this.send({
          type: 'PING',
          payload: { timestamp: Date.now() },
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          priority: 0,
          requiresAck: false
        });
      }
    }, this.config.pingInterval);
  }

  /**
   * Handle WebSocket connection errors
   */
  private handleConnectionError(error: any): void {
    console.error('WebSocket error:', error);
    this.emit('error', new ApiError({
      code: 'CONNECTION_ERROR',
      message: error.message || 'WebSocket connection error'
    }));

    if (this.config.autoReconnect && this.reconnectCount < this.config.reconnectAttempts) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    const backoffTime = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectCount),
      this.config.maxBackoff
    );

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectCount++;
      this.connect();
    }, backoffTime);
  }

  /**
   * Handle WebSocket connection close
   */
  private handleClose(event: CloseEvent): void {
    this.isConnected = false;
    this.emit('disconnected', event);

    if (event.code !== 1000 && this.config.autoReconnect) {
      this.attemptReconnection();
    }
  }

  /**
   * Clear all timers and intervals
   */
  private clearTimers(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Set up metrics collection for monitoring
   */
  private setupMetricsCollection(): void {
    this.on('connected', () => {
      // Emit connection metrics
      this.emit('metrics', {
        type: 'connection',
        timestamp: Date.now(),
        reconnectCount: this.reconnectCount
      });
    });

    this.on('message', () => {
      // Emit message metrics
      this.emit('metrics', {
        type: 'message',
        timestamp: Date.now(),
        queueSize: this.messageQueue.size
      });
    });
  }
}

export default WebSocketService;