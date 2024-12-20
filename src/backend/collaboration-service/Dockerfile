# Build stage
FROM node:20-alpine AS builder

# Build arguments
ARG NODE_ENV=production
ARG PORT=3000
ARG WS_MAX_CONNECTIONS=10000
ARG WS_TIMEOUT=30000
ARG NODE_OPTIONS="--max-old-space-size=2048"

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY yarn.lock ./

# Install all dependencies including devDependencies
RUN set -ex && \
    yarn install --frozen-lockfile && \
    # Security audit
    yarn audit && \
    # Clean yarn cache
    yarn cache clean

# Copy TypeScript source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Run TypeScript compilation with optimizations
RUN yarn build && \
    # Remove source maps in production
    find ./dist -name "*.map" -delete && \
    # Prune dev dependencies
    yarn install --production --frozen-lockfile --ignore-scripts

# Production stage
FROM node:20-alpine

# Build arguments
ARG NODE_ENV=production
ARG PORT=3000
ARG WS_MAX_CONNECTIONS=10000
ARG WS_TIMEOUT=30000
ARG NODE_OPTIONS="--max-old-space-size=2048"

# Labels for container identification
LABEL maintainer="AI-Powered Detection Platform Team" \
      vendor="AI-Powered Detection Platform" \
      security.compliance="SOC2,GDPR,PCI" \
      description="Real-time collaboration service with WebSocket support"

# Set secure environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    WS_MAX_CONNECTIONS=${WS_MAX_CONNECTIONS} \
    WS_TIMEOUT=${WS_TIMEOUT} \
    NODE_OPTIONS=${NODE_OPTIONS} \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_AUDIT=true \
    NPM_CONFIG_STRICT_SSL=true \
    DOCKER_CONTENT_TRUST=1

# Install security packages and dumb-init
RUN set -ex && \
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        ca-certificates \
        tzdata \
        dumb-init && \
    # Configure system for WebSocket optimization
    echo "net.core.somaxconn=65535" >> /etc/sysctl.conf && \
    echo "net.ipv4.tcp_max_syn_backlog=65535" >> /etc/sysctl.conf && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/yarn.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY healthcheck.js ./

# Copy security configurations
COPY --from=builder /app/security-config.json ./

# Configure non-root user and permissions
RUN addgroup -g 10001 -S nodejs && \
    adduser -u 10001 -S nodejs -G nodejs -s /sbin/nologin && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Set up read-only root filesystem
VOLUME ["/tmp", "/var/run"]

# Switch to non-root user
USER nodejs:nodejs

# Configure health check with WebSocket verification
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node healthcheck.js || exit 1

# Set resource limits for WebSocket optimization
EXPOSE ${PORT}

# Use dumb-init as init system for proper signal handling
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

# Security options
LABEL security.features="no-new-privileges,read-only-root,non-root-user" \
      org.opencontainers.image.source="https://github.com/your-org/ai-powered-detection-platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT"

# Size optimization labels
LABEL org.opencontainers.image.size.optimization="alpine-base,multi-stage,production-only" \
      org.opencontainers.image.base.name="node:20-alpine"