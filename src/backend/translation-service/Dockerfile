# Build stage
ARG GO_VERSION=1.21
FROM golang:${GO_VERSION}-alpine AS builder

# Set build arguments
ARG TRANSLATION_SERVICE_VERSION=latest
ARG BUILD_FLAGS='-ldflags="-s -w -extldflags \"-static\""'

# Set secure build environment
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    # Translation service specific environment
    TRANSLATION_SERVICE_PORT=8080 \
    MAX_TRANSLATION_SIZE=10MB \
    TRANSLATION_CACHE_SIZE=256MB

# Install build dependencies
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        ca-certificates \
        git \
        make \
        gcc \
        build-base \
        upx && \
    # Security hardening for build environment
    go env -w GOFLAGS="-mod=readonly" && \
    go env -w GOSUMDB="sum.golang.org" && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/*

# Set working directory
WORKDIR /app/translation-service

# Copy go.mod and go.sum for dependency caching
COPY go.mod go.sum ./
RUN go mod download && \
    go mod verify

# Copy source code
COPY . .

# Build with security flags and optimizations
RUN go build \
    ${BUILD_FLAGS} \
    -trimpath \
    -buildmode=pie \
    -o /app/translation-service/bin/translation-service cmd/main.go && \
    # Compress binary
    upx --best --lzma /app/translation-service/bin/translation-service && \
    # Verify binary
    sha256sum /app/translation-service/bin/translation-service > /app/translation-service/bin/translation-service.sha256

# Runtime stage
FROM alpine:3.18 AS final

# Set runtime environment variables
ENV TRANSLATION_SERVICE_PORT=8080 \
    MAX_TRANSLATION_SIZE=10MB \
    TRANSLATION_CACHE_SIZE=256MB \
    TRANSLATION_LOG_LEVEL=info

# Install runtime dependencies
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache \
        ca-certificates \
        tzdata \
        libcap && \
    # Create non-root user
    addgroup -g 10001 -S translation && \
    adduser -u 10001 -S translation-service -G translation -s /sbin/nologin && \
    # Set up directories
    mkdir -p /app/translation-service/config && \
    mkdir -p /app/translation-service/cache && \
    # Set permissions
    chown -R translation-service:translation /app/translation-service && \
    chmod -R 755 /app/translation-service && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/*

# Copy binary and checksum from builder
COPY --from=builder --chown=translation-service:translation \
    /app/translation-service/bin/translation-service \
    /app/translation-service/bin/translation-service
COPY --from=builder --chown=translation-service:translation \
    /app/translation-service/bin/translation-service.sha256 \
    /app/translation-service/bin/translation-service.sha256

# Verify binary integrity
RUN cd /app/translation-service/bin && \
    sha256sum -c translation-service.sha256 && \
    rm translation-service.sha256 && \
    chmod 500 translation-service

# Set working directory
WORKDIR /app/translation-service

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider \
        http://localhost:${TRANSLATION_SERVICE_PORT}/health || exit 1

# Switch to non-root user
USER translation-service:translation

# Expose service port
EXPOSE ${TRANSLATION_SERVICE_PORT}

# Set entrypoint
ENTRYPOINT ["/app/translation-service/bin/translation-service"]

# Resource limits and security labels
LABEL org.opencontainers.image.source="https://github.com/your-org/detection-platform" \
      org.opencontainers.image.vendor="AI-Powered Detection Platform" \
      org.opencontainers.image.title="Translation Service" \
      org.opencontainers.image.description="Cross-platform detection format translation service" \
      org.opencontainers.image.version="${TRANSLATION_SERVICE_VERSION}" \
      security.hardening="enabled" \
      security.compliance="SOC2,GDPR,PCI"

# Set stop signal
STOPSIGNAL SIGTERM