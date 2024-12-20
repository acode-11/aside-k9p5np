# Build stage
ARG GO_VERSION=1.21
FROM golang:${GO_VERSION}-alpine AS builder

# Import build arguments
ARG BUILD_FLAGS='-ldflags="-s -w -extldflags \"-static\""'
ARG SECURITY_PACKAGES="ca-certificates tzdata git build-base upx"

# Set secure build environment
ENV GO111MODULE=on \
    CGO_ENABLED=0 \
    GOOS=linux \
    GOARCH=amd64 \
    GOPRIVATE=github.com/your-org/* \
    GOPROXY=direct \
    GOSUMDB=sum.golang.org

# Install build dependencies and security packages
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache ${SECURITY_PACKAGES} && \
    # Security hardening for build environment
    echo "Verifying Go installation..." && \
    go version && \
    go env -w GOFLAGS="-mod=readonly" && \
    # Enable module verification
    go env -w GOSUMDB="sum.golang.org" && \
    go env -w GONOSUMDB="github.com/your-org/*" && \
    # Clean up
    rm -rf /var/cache/apk/* /tmp/*

# Set up workspace with appropriate permissions
WORKDIR /build

# Copy go.mod and go.sum for dependency caching
COPY go.mod go.sum ./
RUN go mod download && \
    go mod verify

# Copy source code
COPY . .

# Build with security flags and optimizations
RUN go build ${BUILD_FLAGS} \
        -trimpath \
        -buildmode=pie \
        -o /app/service && \
    # Compress binary
    upx --best --lzma /app/service && \
    # Verify binary
    sha256sum /app/service > /app/service.sha256

# Runtime stage
ARG ALPINE_VERSION=3.18
FROM alpine:${ALPINE_VERSION} AS runtime

# Import security configurations from base image
COPY --from=base /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=base /etc/passwd /etc/passwd
COPY --from=base /etc/group /etc/group

# Set runtime environment variables
ENV PORT=8080 \
    GIN_MODE=release \
    GOMAXPROCS=4

# Install runtime security packages
RUN apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache ca-certificates tzdata audit && \
    # Security hardening
    addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup -s /sbin/nologin && \
    # Set up logging
    mkdir -p /var/log/app && \
    chown -R appuser:appgroup /var/log/app && \
    # Cleanup
    rm -rf /var/cache/apk/* /tmp/*

# Set up working directory
WORKDIR /app

# Copy binary and checksum from builder
COPY --from=builder --chown=appuser:appgroup /app/service /app/
COPY --from=builder --chown=appuser:appgroup /app/service.sha256 /app/

# Verify binary integrity
RUN sha256sum -c service.sha256 && \
    rm service.sha256 && \
    chmod 500 /app/service

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Switch to non-root user
USER appuser:appgroup

# Expose service port
EXPOSE ${PORT}

# Set entrypoint
ENTRYPOINT ["/app/service"]

# Resource limits and security labels
LABEL org.opencontainers.image.source="https://github.com/your-org/detection-platform" \
      org.opencontainers.image.vendor="AI-Powered Detection Platform" \
      org.opencontainers.image.title="Go Service Base Image" \
      org.opencontainers.image.description="Security-hardened Go service runtime" \
      org.opencontainers.image.version="1.0.0" \
      security.hardening="enabled" \
      security.compliance="SOC2,GDPR,PCI"

# Set stop signal
STOPSIGNAL SIGTERM