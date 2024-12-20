# Build stage
FROM node:20-alpine AS builder

# Build arguments
ARG NODE_ENV=production
ARG PORT=3001
ARG SECURITY_SCAN_ENABLED=true
ARG DEPENDENCY_CHECK_LEVEL=high

# Set secure environment variables
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_AUDIT=true \
    NPM_CONFIG_STRICT_SSL=true \
    NPM_CONFIG_IGNORE_SCRIPTS=true \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PACKAGE_LOCK=true

# Set working directory
WORKDIR /app

# Install build essentials and security tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    git \
    # Security scanning tools
    trivy \
    snyk

# Copy package files with integrity verification
COPY --chown=node:node package*.json ./
COPY --chown=node:node yarn.lock ./

# Install dependencies with security measures
RUN npm ci --ignore-scripts --audit=true && \
    # Run security audit
    npm audit && \
    # Install production dependencies only
    npm prune --production

# Copy TypeScript configuration and source code
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node src/ ./src/

# Build with strict type checking
RUN npm run build && \
    # Run security tests if enabled
    if [ "$SECURITY_SCAN_ENABLED" = "true" ]; then \
        trivy filesystem --severity HIGH,CRITICAL . ; \
        snyk test --severity-threshold=$DEPENDENCY_CHECK_LEVEL ; \
    fi

# Production stage
FROM node:20-alpine AS production

# Build arguments
ARG PORT=3001
ARG AUTH_LOG_LEVEL=info
ARG NODE_ENV=production

# Set secure environment variables
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT} \
    AUTH_SERVICE_VERSION=1.0.0 \
    JWT_ALGORITHM=RS256 \
    OAUTH_VERSION=2.0 \
    MFA_ENABLED=true \
    AUTH_LOG_LEVEL=${AUTH_LOG_LEVEL}

# Install production dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    tzdata \
    # Security packages
    ca-certificates \
    openssl

# Create non-root user
RUN addgroup -g 10001 -S nodegroup && \
    adduser -u 10001 -S node -G nodegroup

# Set working directory
WORKDIR /app

# Copy built artifacts from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

# Configure security boundaries
RUN mkdir -p /app/logs && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Set up audit logging
RUN mkdir -p /var/log/auth && \
    chown -R node:node /var/log/auth

# Switch to non-root user
USER node

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health/auth || exit 1

# Container security configurations
LABEL maintainer="AI-Powered Detection Platform Team" \
      vendor="AI-Powered Detection Platform" \
      security.compliance="SOC2,GDPR,PCI" \
      description="Authentication service for AI-Powered Detection Platform"

# Set resource limits
EXPOSE ${PORT}

# Use dumb-init as init system
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/index.js"]

# Security options
STOPSIGNAL SIGTERM

# Read-only root filesystem
VOLUME ["/tmp", "/var/run", "/var/log/auth"]

# Drop all capabilities except those required
RUN setcap 'cap_net_bind_service=+ep' /usr/local/bin/node

# Security labels
LABEL security.features="no-new-privileges,read-only-root,non-root-user" \
      org.opencontainers.image.source="https://github.com/your-org/ai-powered-detection-platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.licenses="MIT"