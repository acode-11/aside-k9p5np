# Base image with explicit version for security tracking
# alpine:3.18 - v3.18.4 (2023-10)
ARG ALPINE_VERSION=3.18
FROM alpine:${ALPINE_VERSION} as base

# Build arguments for customization
ARG SECURITY_PACKAGES="ca-certificates tzdata audit"
ARG APP_USER=appuser
ARG APP_GROUP=appgroup
ARG APP_UID=10001
ARG APP_GID=10001

# Set labels for container identification and compliance
LABEL maintainer="AI-Powered Detection Platform Team" \
      vendor="AI-Powered Detection Platform" \
      security.compliance="SOC2,GDPR,PCI" \
      description="Security-hardened base image for AI-Powered Detection Platform services"

# Set environment variables for security and standardization
ENV TZ=UTC \
    LANG=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    DOCKER_CONTENT_TRUST=1 \
    SECURITY_OPTS="no-new-privileges:true" \
    PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    HEALTHCHECK_INTERVAL=30s

# Security hardening and package installation
RUN set -ex && \
    # Update system and install security packages
    apk update && \
    apk upgrade --no-cache && \
    apk add --no-cache $SECURITY_PACKAGES && \
    # Configure timezone
    cp /usr/share/zoneinfo/UTC /etc/localtime && \
    echo "UTC" > /etc/timezone && \
    # Create non-root user/group
    addgroup -g ${APP_GID} -S ${APP_GROUP} && \
    adduser -u ${APP_UID} -S ${APP_USER} -G ${APP_GROUP} -s /sbin/nologin && \
    # Security hardening
    # Remove unnecessary tools and shell access
    rm -rf /bin/ash /bin/sh && \
    # Set up audit logging
    mkdir -p /var/log/audit && \
    chmod 700 /var/log/audit && \
    # Update CA certificates
    update-ca-certificates && \
    # Set restrictive permissions
    chmod -R 644 /etc/ssl/certs && \
    chmod -R 755 /usr/share/ca-certificates && \
    # Cleanup
    rm -rf /var/cache/apk/* /tmp/* /var/tmp/*

# Configure container security options
RUN echo "kernel.unprivileged_userns_clone=0" >> /etc/sysctl.d/99-security.conf && \
    echo "kernel.core_pattern=|/bin/false" >> /etc/sysctl.d/99-security.conf

# Set up health check
HEALTHCHECK --interval=${HEALTHCHECK_INTERVAL} --timeout=5s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-8080}/health || exit 1

# Set working directory with appropriate permissions
WORKDIR /app
RUN chown -R ${APP_USER}:${APP_GROUP} /app && \
    chmod -R 755 /app

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Default command and entrypoint placeholders
# These should be overridden by specific service Dockerfiles
CMD ["echo", "Please specify a command in your service Dockerfile"]
ENTRYPOINT []

# Resource limits for container optimization
STOPSIGNAL SIGTERM