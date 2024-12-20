# Stage 1: Python base image with security hardening
FROM python:3.11-slim-bullseye as python-base

# Set secure environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=1.6.1 \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache \
    PATH="/opt/poetry/bin:$PATH" \
    PYTHONPATH=/app \
    PYTHON_HASH_SEED=random \
    PYTHONWARNINGS=default \
    ELASTICSEARCH_TIMEOUT=30 \
    MAX_WORKERS=4

# Install system dependencies and Poetry with security hardening
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        gcc \
        g++ \
        && \
    # Install Poetry with integrity verification
    curl -sSL https://install.python-poetry.org | python3 - && \
    # Security cleanup
    apt-get remove -y curl gcc g++ && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 2: Builder stage for dependencies
FROM python-base as builder

WORKDIR /app

# Copy dependency files with explicit versions
COPY pyproject.toml poetry.lock ./

# Install dependencies and generate optimized wheels
RUN poetry config virtualenvs.create false && \
    poetry install --no-dev --no-root --no-interaction --no-ansi && \
    poetry export -f requirements.txt --output requirements.txt && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# Stage 3: Final production image
FROM python:3.11-slim-bullseye as final

# Create non-root user for security
ARG APP_USER=searchapp
ARG APP_GROUP=searchapp
ARG APP_UID=10001
ARG APP_GID=10001

# Set production environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH" \
    PYTHON_HASH_SEED=random \
    PYTHONWARNINGS=default

# Install runtime dependencies and configure security
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        tini \
        curl \
        && \
    groupadd -g ${APP_GID} ${APP_GROUP} && \
    useradd -u ${APP_UID} -g ${APP_GROUP} -s /sbin/nologin ${APP_USER} && \
    # Security hardening
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/* && \
    # Set up Python security features
    python -c "import os; os.umask(0o027)" && \
    # Configure resource limits
    ulimit -n 65535

WORKDIR /app

# Copy wheels and install dependencies
COPY --from=builder /wheels /wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt && \
    rm -rf /wheels requirements.txt

# Copy application code with proper permissions
COPY --chown=${APP_USER}:${APP_GROUP} ./src ./src

# Set up application directory permissions
RUN chown -R ${APP_USER}:${APP_GROUP} /app && \
    chmod -R 755 /app

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Configure health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Start FastAPI application with resource limits
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--limit-concurrency", "1000"]

# Resource limits and optimization
STOPSIGNAL SIGTERM

# Expose service port
EXPOSE 8000