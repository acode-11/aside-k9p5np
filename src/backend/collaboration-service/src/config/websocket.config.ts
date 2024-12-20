import { injectable } from 'inversify';

/**
 * Default configuration values for WebSocket server
 * @version 1.0.0
 */
export const DEFAULT_WS_PORT = 8080;
export const DEFAULT_HEARTBEAT_INTERVAL = 30000; // 30 seconds
export const MAX_CONNECTIONS = 10000;

/**
 * SSL configuration interface for WebSocket secure connections
 */
interface SSLConfig {
  enabled: boolean;
  key?: string;
  cert?: string;
}

/**
 * Logging configuration interface for WebSocket server
 */
interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Monitoring configuration interface for WebSocket metrics
 */
interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number;
}

/**
 * Comprehensive WebSocket server configuration interface
 * @interface WebSocketConfig
 * @description Defines all configuration options for the WebSocket server including
 * security settings, performance limits, monitoring, and logging options
 */
export interface WebSocketConfig {
  /** Port number for WebSocket server (1024-65535) */
  port: number;
  
  /** Heartbeat interval in milliseconds (5000-60000) */
  heartbeatInterval: number;
  
  /** Maximum number of concurrent connections (100-100000) */
  maxConnections: number;
  
  /** List of allowed origin domains for CORS */
  allowedOrigins: string[];
  
  /** WebSocket endpoint path */
  path: string;
  
  /** SSL/TLS configuration for secure WebSocket (WSS) */
  ssl: SSLConfig;
  
  /** Logging configuration */
  logging: LoggingConfig;
  
  /** Monitoring and metrics configuration */
  monitoring: MonitoringConfig;
}

/**
 * Factory function to create and validate WebSocket configuration
 * @function getWebSocketConfig
 * @returns {WebSocketConfig} Validated WebSocket configuration object
 * @throws {Error} If configuration validation fails
 */
@injectable()
export function getWebSocketConfig(): WebSocketConfig {
  // Load environment variables with fallbacks
  const config: WebSocketConfig = {
    port: Number(process.env.WS_PORT) || DEFAULT_WS_PORT,
    heartbeatInterval: Number(process.env.WS_HEARTBEAT_INTERVAL) || DEFAULT_HEARTBEAT_INTERVAL,
    maxConnections: Number(process.env.WS_MAX_CONNECTIONS) || MAX_CONNECTIONS,
    allowedOrigins: process.env.WS_ALLOWED_ORIGINS ? 
      process.env.WS_ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
    path: process.env.WS_PATH || '/ws',
    ssl: {
      enabled: process.env.WS_SSL_ENABLED === 'true',
      key: process.env.WS_SSL_KEY,
      cert: process.env.WS_SSL_CERT
    },
    logging: {
      enabled: process.env.WS_LOGGING_ENABLED !== 'false',
      level: (process.env.WS_LOGGING_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error'
    },
    monitoring: {
      enabled: process.env.WS_MONITORING_ENABLED !== 'false',
      metricsInterval: Number(process.env.WS_METRICS_INTERVAL) || 60000
    }
  };

  // Validate port number
  if (config.port < 1024 || config.port > 65535) {
    throw new Error('WebSocket port must be between 1024 and 65535');
  }

  // Validate heartbeat interval
  if (config.heartbeatInterval < 5000 || config.heartbeatInterval > 60000) {
    throw new Error('Heartbeat interval must be between 5000ms and 60000ms');
  }

  // Validate max connections
  if (config.maxConnections < 100 || config.maxConnections > 100000) {
    throw new Error('Maximum connections must be between 100 and 100000');
  }

  // Validate SSL configuration
  if (config.ssl.enabled) {
    if (!config.ssl.key || !config.ssl.cert) {
      throw new Error('SSL key and certificate are required when SSL is enabled');
    }
  }

  // Validate allowed origins
  if (!Array.isArray(config.allowedOrigins) || config.allowedOrigins.length === 0) {
    throw new Error('At least one allowed origin must be specified');
  }

  // Validate WebSocket path
  if (!config.path.startsWith('/') || config.path.length < 2) {
    throw new Error('WebSocket path must start with / and be at least 2 characters long');
  }

  // Validate logging level
  const validLogLevels = ['debug', 'info', 'warn', 'error'];
  if (!validLogLevels.includes(config.logging.level)) {
    throw new Error(`Invalid logging level. Must be one of: ${validLogLevels.join(', ')}`);
  }

  // Validate metrics interval
  if (config.monitoring.enabled && 
      (config.monitoring.metricsInterval < 1000 || config.monitoring.metricsInterval > 300000)) {
    throw new Error('Metrics interval must be between 1000ms and 300000ms');
  }

  return config;
}