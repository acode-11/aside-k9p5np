# Build stage
ARG GO_VERSION=1.21
FROM golang:${GO_VERSION}-alpine AS builder

# Build arguments for customization and versioning
ARG SERVICE_NAME=detection-service
ARG BUILD_VERSION=1.0.0
ARG BUILD_DATE=unknown
ARG GIT_COMMIT=unknown

# Set secure build environment
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    # Enable Go module verification
    GOSUMDB=sum.golang.org \
    # Set build flags for optimization
    GOFLAGS="-mod=readonly -trimpath"

# Install build dependencies
RUN apk update && \
    apk add --no-cache \
    git \
    make \
    gcc \
    g++ \
    upx \
    ca-certificates \
    tzdata && \
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app/detection-service

# Copy go.mod and go.sum for dependency caching
COPY go.mod go.sum ./
RUN go mod download && \
    go mod verify

# Copy source code
COPY . .

# Build optimized binary
RUN go build \
    -trimpath \
    -ldflags="-s -w \
    -X main.Version=${BUILD_VERSION} \
    -X main.BuildDate=${BUILD_DATE} \
    -X main.GitCommit=${GIT_COMMIT} \
    -extldflags '-static'" \
    -o /app/detection-service/detection-service cmd/main.go && \
    # Compress binary
    upx --best --lzma /app/detection-service/detection-service && \
    # Generate checksum
    sha256sum /app/detection-service/detection-service > /app/detection-service/detection-service.sha256

# Final stage
FROM alpine:3.18 AS final

# Create non-root user
RUN addgroup -g 10001 -S detection && \
    adduser -u 10001 -S detection -G detection -s /sbin/nologin && \
    # Install runtime dependencies
    apk add --no-cache \
    ca-certificates \
    tzdata && \
    # Cleanup
    rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app/detection-service

# Copy binary and checksum from builder
COPY --from=builder --chown=detection:detection /app/detection-service/detection-service ./
COPY --from=builder --chown=detection:detection /app/detection-service/detection-service.sha256 ./

# Verify binary integrity and set permissions
RUN sha256sum -c detection-service.sha256 && \
    rm detection-service.sha256 && \
    chmod 500 detection-service

# Configure environment variables
ENV PORT=50051 \
    METRICS_PORT=9090 \
    GIN_MODE=release \
    GOMAXPROCS=4

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${METRICS_PORT}/health || exit 1

# Expose ports for gRPC and metrics
EXPOSE ${PORT} ${METRICS_PORT}

# Switch to non-root user
USER detection:detection

# Set secure entry point
ENTRYPOINT ["./detection-service"]

# Container metadata and security labels
LABEL org.opencontainers.image.title="Detection Service" \
      org.opencontainers.image.description="AI-Powered Detection Platform - Detection Service" \
      org.opencontainers.image.source="https://github.com/your-org/detection-platform" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.vendor="AI-Powered Detection Platform" \
      security.hardening="enabled" \
      security.compliance="SOC2,GDPR,PCI"

# Set stop signal
STOPSIGNAL SIGTERM