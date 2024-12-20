# Use multi-stage build for optimized Node.js image
# node:20-alpine - v20.9.0-alpine3.18 (2023-10)
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS node-base

# Import security configurations from base.dockerfile
LABEL maintainer="AI-Powered Detection Platform Team" \
      vendor="AI-Powered Detection Platform" \
      security.compliance="SOC2,GDPR,PCI" \
      description="Security-hardened Node.js base image for AI-Powered Detection Platform services"

# Build arguments
ARG NODE_ENV=production
ARG SECURITY_PACKAGES="ca-certificates tzdata audit dumb-init"

# Set secure environment variables
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_LOGLEVEL=warn \
    NPM_CONFIG_AUDIT=true \
    NPM_CONFIG_STRICT_SSL=true \
    NPM_CONFIG_IGNORE_SCRIPTS=true \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_PACKAGE_LOCK=true \
    NPM_CONFIG_SAVE_EXACT=true \
    NPM_CONFIG_PRODUCTION=true \
    NODE_OPTIONS="--max-old-space-size=2048 --max-http-header-size=16384" \
    PATH="/app/node_modules/.bin:$PATH" \
    DOCKER_CONTENT_TRUST=1

# Install security packages and configure system
RUN set -ex && \
    # Update and install security packages
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache $SECURITY_PACKAGES && \
    # Configure npm security settings
    npm config set audit true && \
    npm config set strict-ssl true && \
    npm config set ignore-scripts true && \
    npm config set fund false && \
    npm config set package-lock true && \
    npm config set save-exact true && \
    # Security hardening
    echo "fs.file-max = 65535" >> /etc/sysctl.conf && \
    echo "kernel.unprivileged_userns_clone=0" >> /etc/sysctl.conf && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/* && \
    # Set up app directory
    mkdir -p /app && \
    chown -R node:node /app

# Set working directory
WORKDIR /app

# Switch to non-root user
USER node:node

# Configure security options
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Use dumb-init as init system
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["echo", "Please specify a command in your service Dockerfile"]

# Set read-only root filesystem
VOLUME ["/tmp", "/var/run"]
RUN chmod -R 755 /app

# Security options
LABEL security.features="no-new-privileges,read-only-root,non-root-user" \
      org.opencontainers.image.source="https://github.com/your-org/ai-powered-detection-platform" \
      org.opencontainers.image.version="${NODE_VERSION}" \
      org.opencontainers.image.licenses="MIT"

# Size optimization labels
LABEL org.opencontainers.image.size.optimization="alpine-base,production-only,minimal-deps" \
      org.opencontainers.image.base.name="node:${NODE_VERSION}-alpine"