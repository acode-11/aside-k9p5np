# Build arguments for customization
ARG PYTHON_VERSION=3.11
ARG POETRY_VERSION=1.6.1
ARG BUILD_ENV=prod
ARG ENABLE_GPU=false

# Stage 1: Python base image with common configuration
FROM python:${PYTHON_VERSION}-slim-bullseye as python-base

# Import security configurations from base.dockerfile
COPY --from=base.dockerfile /etc/sysctl.d/99-security.conf /etc/sysctl.d/
COPY --from=base.dockerfile /etc/ssl/certs /etc/ssl/certs

# Set Python-specific environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=${POETRY_VERSION} \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache \
    PATH="/opt/poetry/bin:$PATH" \
    PYTHONPATH=/app \
    CUDA_VISIBLE_DEVICES=""

# Install system dependencies and Poetry
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        build-essential \
        gcc \
        g++ \
        make \
        git \
        && \
    # Install Poetry
    curl -sSL https://install.python-poetry.org | python3 - && \
    # Security hardening
    apt-get remove -y curl && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 2: Builder stage for dependencies
FROM python-base as builder

WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies and generate wheels
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev --no-root --no-interaction --no-ansi && \
    poetry export -f requirements.txt --output requirements.txt && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

# Stage 3: Final production image
FROM python:${PYTHON_VERSION}-slim-bullseye as final

# Import non-root user configuration from base.dockerfile
ARG APP_USER=appuser
ARG APP_GROUP=appgroup
ARG APP_UID=10001
ARG APP_GID=10001

# Copy security configurations and certificates
COPY --from=python-base /etc/ssl/certs /etc/ssl/certs
COPY --from=python-base /etc/sysctl.d/99-security.conf /etc/sysctl.d/

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH" \
    PYTHON_HASH_SEED=random \
    PYTHONWARNINGS=default \
    PYTHONDEVMODE=1

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tini \
        && \
    # Create non-root user/group
    groupadd -g ${APP_GID} ${APP_GROUP} && \
    useradd -u ${APP_UID} -g ${APP_GROUP} -s /sbin/nologin ${APP_USER} && \
    # Security hardening
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    # Set up Python security features
    python -c "import os; os.umask(0o027)" && \
    # Configure resource limits
    ulimit -n 65535

# Copy wheels and install dependencies
WORKDIR /app
COPY --from=builder /app/wheels /app/wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt && \
    rm -rf /app/wheels /app/requirements.txt

# Set up application directory permissions
RUN chown -R ${APP_USER}:${APP_GROUP} /app && \
    chmod -R 755 /app

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Configure container init and health check
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Resource limits and optimization
STOPSIGNAL SIGTERM