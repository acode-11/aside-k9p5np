# Stage 1: Builder
FROM kong:2.8.1-alpine AS builder

# Build arguments
ARG KONG_USER=kong
ARG KONG_GROUP=kong
ARG LUA_VERSION=5.1
ARG LUAROCKS_VERSION=3.9.2

# Set labels for container identification
LABEL maintainer="AI-Powered Detection Platform Team" \
      vendor="AI-Powered Detection Platform" \
      version="1.0.0" \
      security.compliance="SOC2,GDPR,PCI" \
      description="Kong API Gateway with enhanced security features"

# Install build dependencies and security packages
RUN apk add --no-cache \
    build-base \
    git \
    curl \
    perl \
    unzip \
    zip \
    ca-certificates \
    openssl \
    lua${LUA_VERSION} \
    lua${LUA_VERSION}-dev \
    luarocks${LUAROCKS_VERSION} \
    && update-ca-certificates

# Install Lua dependencies
RUN luarocks install lua-resty-jwt 0.2.3 \
    && luarocks install lua-resty-redis 0.29

# Create plugin directories
RUN mkdir -p /usr/local/kong/plugins \
    && chown -R ${KONG_USER}:${KONG_GROUP} /usr/local/kong/plugins

# Copy custom plugins
COPY --chown=${KONG_USER}:${KONG_GROUP} plugins/cors-config.lua /usr/local/kong/plugins/
COPY --chown=${KONG_USER}:${KONG_GROUP} plugins/jwt-validator.lua /usr/local/kong/plugins/
COPY --chown=${KONG_USER}:${KONG_GROUP} plugins/rate-limiting.lua /usr/local/kong/plugins/

# Verify plugin configurations
RUN kong check /usr/local/kong/plugins/*.lua

# Copy Kong configuration
COPY --chown=${KONG_USER}:${KONG_GROUP} kong.yml /usr/local/kong/declarative/

# Stage 2: Final
FROM kong:2.8.1-alpine

# Security patches and updates
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    && update-ca-certificates

# Copy validated artifacts from builder
COPY --from=builder /usr/local/kong/plugins /usr/local/kong/plugins
COPY --from=builder /usr/local/kong/declarative/kong.yml /usr/local/kong/declarative/
COPY --from=builder /usr/local/share/lua /usr/local/share/lua

# Set environment variables
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/usr/local/kong/declarative/kong.yml \
    KONG_PROXY_ACCESS_LOG=/dev/stdout \
    KONG_ADMIN_ACCESS_LOG=/dev/stdout \
    KONG_PROXY_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_ERROR_LOG=/dev/stderr \
    KONG_ADMIN_LISTEN=0.0.0.0:8001 \
    KONG_PROXY_LISTEN=0.0.0.0:8000 \
    KONG_PLUGINS=bundled,cors-config,jwt-validator,rate-limiting \
    KONG_SSL_CERT_PATH=/etc/kong/ssl/tls.crt \
    KONG_SSL_KEY_PATH=/etc/kong/ssl/tls.key \
    KONG_NGINX_WORKER_PROCESSES=auto \
    KONG_HEADERS=off \
    KONG_REAL_IP_HEADER=X-Forwarded-For \
    KONG_TRUSTED_IPS=0.0.0.0/0 \
    KONG_NGINX_PROXY_PROXY_BUFFER_SIZE=128k \
    KONG_NGINX_PROXY_PROXY_BUFFERS=4 256k \
    KONG_NGINX_PROXY_PROXY_BUSY_BUFFERS_SIZE=256k

# Security headers
ENV KONG_HEADERS_SERVER_TOKENS=off \
    KONG_HEADERS_X_FRAME_OPTIONS=DENY \
    KONG_HEADERS_X_CONTENT_TYPE_OPTIONS=nosniff \
    KONG_HEADERS_X_XSS_PROTECTION="1; mode=block" \
    KONG_HEADERS_STRICT_TRANSPORT_SECURITY="max-age=31536000; includeSubDomains"

# Create required directories with proper permissions
RUN mkdir -p /usr/local/kong/logs \
    && mkdir -p /usr/local/kong/declarative \
    && mkdir -p /etc/kong/ssl \
    && chown -R kong:kong /usr/local/kong \
    && chown -R kong:kong /etc/kong

# Health check configuration
HEALTHCHECK --interval=10s --timeout=10s --retries=3 \
    CMD kong health

# Expose ports
EXPOSE 8000 8001 8443 8444

# Switch to non-root user
USER kong

# Start Kong
CMD ["kong", "docker-start"]