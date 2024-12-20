import { NestFactory } from '@nestjs/core'; // v10.0.0
import { Transport } from '@nestjs/microservices'; // v10.0.0
import { ValidationPipe } from '@nestjs/common'; // v10.0.0
import helmet from 'helmet'; // v7.0.0
import { config } from 'dotenv'; // v16.3.1
import rateLimit from 'express-rate-limit'; // v6.9.0
import { readFileSync } from 'fs';
import { join } from 'path';
import { AUTH_CONFIG } from './config/auth.config';
import { validateJWT } from './middleware/jwt.middleware';

// Load environment configuration
config();

// Global environment variables with secure defaults
const PORT = process.env.AUTH_SERVICE_PORT || 3001;
const GRPC_PORT = process.env.AUTH_SERVICE_GRPC_PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Bootstrap the authentication service with comprehensive security features
 */
async function bootstrap(): Promise<void> {
  try {
    // Create NestJS application instance
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      cors: false // CORS is configured separately for more control
    });

    // Configure gRPC microservice with TLS
    const grpcOptions = {
      transport: Transport.GRPC,
      options: {
        package: 'auth',
        protoPath: join(__dirname, '../../../shared/proto/auth.proto'),
        url: `0.0.0.0:${GRPC_PORT}`,
        credentials: NODE_ENV === 'production' ? {
          rootCerts: readFileSync(process.env.GRPC_ROOT_CERT_PATH),
          privateKey: readFileSync(process.env.GRPC_PRIVATE_KEY_PATH),
          certChain: readFileSync(process.env.GRPC_CERT_CHAIN_PATH)
        } : undefined
      }
    };

    // Initialize gRPC microservice
    app.connectMicroservice(grpcOptions);

    // Configure Helmet middleware with strict CSP
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-site' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    }));

    // Configure rate limiting
    app.use(rateLimit({
      windowMs: AUTH_CONFIG.security.rateLimitWindow * 1000,
      max: AUTH_CONFIG.security.rateLimit,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      message: 'Too many requests from this IP, please try again later'
    }));

    // Configure global validation pipe with strict settings
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false
      },
      disableErrorMessages: NODE_ENV === 'production'
    }));

    // Configure JWT validation middleware
    app.use(validateJWT);

    // Configure CORS with strict origin policy
    app.enableCors({
      origin: AUTH_CONFIG.security.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type', 'x-device-id'],
      exposedHeaders: ['x-request-id'],
      credentials: true,
      maxAge: 3600
    });

    // Configure health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Configure graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    for (const signal of signals) {
      process.on(signal, async () => {
        console.log(`Received ${signal}, starting graceful shutdown`);
        await app.close();
        process.exit(0);
      });
    }

    // Start HTTP server with TLS in production
    if (NODE_ENV === 'production') {
      const httpsOptions = {
        key: readFileSync(process.env.SSL_KEY_PATH),
        cert: readFileSync(process.env.SSL_CERT_PATH),
        ca: readFileSync(process.env.SSL_CA_PATH)
      };
      await app.listen(PORT, '0.0.0.0', httpsOptions);
    } else {
      await app.listen(PORT, '0.0.0.0');
    }

    // Start gRPC microservice
    await app.startAllMicroservices();

    console.log(`Auth service running on port ${PORT}`);
    console.log(`gRPC server running on port ${GRPC_PORT}`);
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap().catch(error => {
  console.error('Unhandled error during bootstrap:', error);
  process.exit(1);
});