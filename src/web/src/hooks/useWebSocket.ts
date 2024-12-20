/**
 * @fileoverview React hook for managing WebSocket connections with enterprise features
 * including automatic reconnection, connection pooling, and type-safe message handling.
 * @version 1.0.0
 * @package @detection-platform/web
 */

import { useState, useEffect, useCallback } from 'react'; // v18.2.0
import { WebSocketService } from '../services/websocket.service';
import { ApiResponse } from '../types/api.types';

/**
 * Connection status enum for detailed state tracking
 */
export enum ConnectionStatus {
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Security configuration interface for WebSocket connections
 */
interface SecurityConfig {
  enableEncryption: boolean;
  validateOrigin: boolean;
  allowedOrigins?: string[];
  maxMessageSize: number;
}

/**
 * Configuration options for the WebSocket hook
 */
export interface UseWebSocketOptions {
  autoConnect: boolean;
  reconnectOnError: boolean;
  reconnectAttempts: number;
  reconnectInterval: number;
  maxReconnectDelay: number;
  enableMessageBatching: boolean;
  batchInterval: number;
  maxBatchSize: number;
  securityConfig: SecurityConfig;
}

/**
 * Connection statistics interface for monitoring
 */
interface ConnectionStats {
  reconnectCount: number;
  messagesSent: number;
  messagesReceived: number;
  lastPingTime: number;
  averageLatency: number;
}

/**
 * Default WebSocket configuration
 */
const DEFAULT_OPTIONS: UseWebSocketOptions = {
  autoConnect: true,
  reconnectOnError: true,
  reconnectAttempts: 5,
  reconnectInterval: 1000,
  maxReconnectDelay: 30000,
  enableMessageBatching: true,
  batchInterval: 100,
  maxBatchSize: 50,
  securityConfig: {
    enableEncryption: true,
    validateOrigin: true,
    maxMessageSize: 1024 * 1024 // 1MB
  }
};

/**
 * Custom hook for managing WebSocket connections with enterprise features
 */
export function useWebSocket<T = unknown>(
  url: string,
  options: Partial<UseWebSocketOptions> = {}
) {
  // Merge options with defaults
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // State management
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [stats, setStats] = useState<ConnectionStats>({
    reconnectCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    lastPingTime: 0,
    averageLatency: 0
  });

  // WebSocket service instance
  const [wsService] = useState(() => new WebSocketService({
    url,
    autoReconnect: config.reconnectOnError,
    reconnectAttempts: config.reconnectAttempts,
    reconnectInterval: config.reconnectInterval,
    maxBackoff: config.maxReconnectDelay,
    enableCompression: true
  }));

  // Message batching queue
  const [messageQueue, setMessageQueue] = useState<any[]>([]);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(async () => {
    try {
      setStatus(ConnectionStatus.CONNECTING);
      await wsService.connect();
    } catch (error) {
      setLastError(error as Error);
      setStatus(ConnectionStatus.ERROR);
    }
  }, [wsService]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(async () => {
    try {
      await wsService.disconnect();
      setStatus(ConnectionStatus.DISCONNECTED);
    } catch (error) {
      setLastError(error as Error);
    }
  }, [wsService]);

  /**
   * Send message through WebSocket connection
   */
  const send = useCallback(<M = any>(message: M) => {
    if (config.enableMessageBatching) {
      setMessageQueue(prev => [...prev, message]);
    } else {
      wsService.send({
        type: 'MESSAGE',
        payload: message,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        priority: 1,
        requiresAck: true
      });
      setStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1
      }));
    }
  }, [wsService, config.enableMessageBatching]);

  /**
   * Subscribe to WebSocket events with type safety
   */
  const subscribe = useCallback(<M = any>(
    eventType: string,
    handler: (response: ApiResponse<M>) => void
  ) => {
    const unsubscribe = wsService.on(eventType, (message: any) => {
      if (wsService.validateMessage(message)) {
        handler(message as ApiResponse<M>);
        setStats(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1
        }));
      }
    });
    return unsubscribe;
  }, [wsService]);

  /**
   * Process message batch
   */
  useEffect(() => {
    if (!config.enableMessageBatching || messageQueue.length === 0) return;

    const batchTimer = setInterval(() => {
      setMessageQueue(prev => {
        const batch = prev.slice(0, config.maxBatchSize);
        if (batch.length > 0) {
          wsService.send({
            type: 'BATCH',
            payload: batch,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            priority: 1,
            requiresAck: true
          });
          setStats(prev => ({
            ...prev,
            messagesSent: prev.messagesSent + batch.length
          }));
        }
        return prev.slice(config.maxBatchSize);
      });
    }, config.batchInterval);

    return () => clearInterval(batchTimer);
  }, [messageQueue, config, wsService]);

  /**
   * Set up WebSocket event listeners
   */
  useEffect(() => {
    const handleConnect = () => {
      setStatus(ConnectionStatus.CONNECTED);
      setLastError(null);
    };

    const handleDisconnect = () => {
      setStatus(ConnectionStatus.DISCONNECTED);
    };

    const handleError = (error: Error) => {
      setLastError(error);
      setStatus(ConnectionStatus.ERROR);
    };

    wsService.on('connected', handleConnect);
    wsService.on('disconnected', handleDisconnect);
    wsService.on('error', handleError);

    // Auto-connect if enabled
    if (config.autoConnect) {
      connect();
    }

    return () => {
      wsService.disconnect();
    };
  }, [wsService, config.autoConnect, connect]);

  /**
   * Return hook interface
   */
  return {
    status,
    isConnected: status === ConnectionStatus.CONNECTED,
    lastError,
    stats,
    connect,
    disconnect,
    send,
    subscribe,
    batch: (messages: any[]) => {
      setMessageQueue(prev => [...prev, ...messages]);
    }
  };
}

export default useWebSocket;