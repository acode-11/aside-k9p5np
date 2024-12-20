// External dependencies
import { Container } from 'inversify'; // v6.0.1
import { createLogger, format } from 'winston'; // v3.10.0
import { WebSocketServer } from 'ws'; // v8.13.0
import { useContainer } from 'routing-controllers'; // v0.10.4
import * as prometheus from 'prom-client'; // v14.2.0

// Internal dependencies
import { WebSocketConfig } from './config/websocket.config';
import { RealtimeService } from './services/realtime.service';

// Initialize dependency injection container
const container = new Container();

// Configure structured logging
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.metadata({ fillExcept: ['timestamp', 'level', 'message'] })
  ),
  defaultMeta: { service: 'collaboration-service' }
});

// Initialize metrics registry
const metrics = new prometheus.Registry();

// Define metrics collectors
const activeConnections = new prometheus.Gauge({
  name: 'ws_active_connections',
  help: 'Number of active WebSocket connections'
});

const messageLatency = new prometheus.Histogram({
  name: 'ws_message_latency',
  help: 'WebSocket message latency in milliseconds',
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000]
});

const errorCount = new prometheus.Counter({
  name: 'ws_error_count',
  help: 'Number of WebSocket errors'
});

metrics.registerMetric(activeConnections);
metrics.registerMetric(messageLatency);
metrics.registerMetric(errorCount);

/**
 * Sets up dependency injection container with all required services
 */
function setupContainer(): void {
  // Bind WebSocket configuration
  container.bind<WebSocketConfig>('WebSocketConfig').toConstantValue({
    port: Number(process.env.WS_PORT) || 8080,
    heartbeatInterval: 30000,
    maxConnections: 10000,
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    path: '/ws',
    ssl: {
      enabled: process.env.WS_SSL_ENABLED === 'true',
      key: process.env.WS_SSL_KEY,
      cert: process.env.WS_SSL_CERT
    },
    logging: {
      enabled: true,
      level: 'info'
    },
    monitoring: {
      enabled: true,
      metricsInterval: 60000
    }
  });

  // Bind core services
  container.bind<RealtimeService>('RealtimeService').to(RealtimeService);
  container.bind<WebSocketServer>('WebSocketServer').toConstantValue(new WebSocketServer({
    noServer: true
  }));
}

/**
 * Handles graceful server shutdown
 */
async function handleShutdown(wss: WebSocketServer): Promise<void> {
  logger.info('Initiating graceful shutdown...');

  try {
    // Stop accepting new connections
    wss.close(() => {
      logger.info('WebSocket server closed');
    });

    // Close all existing connections
    wss.clients.forEach((client) => {
      client.terminate();
    });

    // Flush metrics
    await metrics.clear();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Bootstraps the collaboration service
 */
async function bootstrapServer(): Promise<void> {
  try {
    // Setup dependency injection
    setupContainer();
    useContainer(container);

    // Get configuration and services
    const config = container.get<WebSocketConfig>('WebSocketConfig');
    const realtimeService = container.get<RealtimeService>('RealtimeService');
    const wss = container.get<WebSocketServer>('WebSocketServer');

    // Setup WebSocket server event handlers
    wss.on('connection', async (socket, request) => {
      const clientId = request.headers['x-client-id'] as string;
      
      try {
        activeConnections.inc();
        
        const connectionInfo = {
          userId: request.headers['x-user-id'] as string,
          organizationId: request.headers['x-org-id'] as string,
          ip: request.socket.remoteAddress || '',
          userAgent: request.headers['user-agent'] || '',
          origin: request.headers.origin || ''
        };

        await realtimeService.handleClientConnection(clientId, connectionInfo);

        socket.on('close', () => {
          activeConnections.dec();
        });

        socket.on('error', (error) => {
          errorCount.inc();
          logger.error('WebSocket error:', { clientId, error });
        });

      } catch (error) {
        errorCount.inc();
        logger.error('Connection handling error:', { clientId, error });
        socket.terminate();
      }
    });

    // Setup shutdown handlers
    process.on('SIGTERM', () => handleShutdown(wss));
    process.on('SIGINT', () => handleShutdown(wss));

    // Start metrics collection
    prometheus.collectDefaultMetrics({ register: metrics });

    logger.info('Collaboration service started', {
      port: config.port,
      maxConnections: config.maxConnections,
      sslEnabled: config.ssl.enabled
    });

  } catch (error) {
    logger.error('Failed to start collaboration service:', error);
    process.exit(1);
  }
}

// Start the server
bootstrapServer().catch((error) => {
  logger.error('Fatal error during server startup:', error);
  process.exit(1);
});

// Export for testing
export { container, metrics };