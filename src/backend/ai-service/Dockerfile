# Build arguments
ARG PYTHON_VERSION=3.11
ARG POETRY_VERSION=1.6.1
ARG CUDA_VERSION=11.8.0
ARG UBUNTU_VERSION=22.04

# Stage 1: Python base with GPU support
FROM nvidia/cuda:${CUDA_VERSION}-base-ubuntu${UBUNTU_VERSION} as python-base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_VERSION=${POETRY_VERSION} \
    POETRY_HOME=/opt/poetry \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1 \
    PORT=8000 \
    MODEL_PATH=/app/models \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    CUDA_VISIBLE_DEVICES=all \
    TF_FORCE_GPU_ALLOW_GROWTH=true \
    TF_GPU_ALLOCATOR=cuda \
    TORCH_CUDA_ARCH_LIST=all

# Install Python and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python${PYTHON_VERSION} \
        python${PYTHON_VERSION}-dev \
        python3-pip \
        curl \
        build-essential \
        git \
        && \
    # Install Poetry
    curl -sSL https://install.python-poetry.org | python3 - && \
    # Security hardening
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 2: Builder stage
FROM python-base as builder

WORKDIR /app

# Copy dependency files
COPY pyproject.toml poetry.lock ./
COPY requirements.txt ./

# Install CUDA development packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        cuda-nvcc-11-8 \
        cuda-cudart-dev-11-8 \
        && \
    # Install ML-specific build dependencies
    pip install --no-cache-dir \
        wheel \
        setuptools \
        nvidia-pyindex \
        && \
    # Install dependencies with GPU support
    poetry config virtualenvs.create false && \
    poetry install --no-dev --no-interaction && \
    # Create optimized wheels
    poetry export -f requirements.txt --output requirements.txt && \
    pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt && \
    # Cleanup
    apt-get remove -y cuda-nvcc-11-8 cuda-cudart-dev-11-8 && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Stage 3: Final production image
FROM nvidia/cuda:${CUDA_VERSION}-base-ubuntu${UBUNTU_VERSION} as final

# Set non-root user
ARG APP_USER=aiservice
ARG APP_GROUP=aiservice
ARG APP_UID=10001
ARG APP_GID=10001

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    MODEL_PATH=/app/models \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    TF_FORCE_GPU_ALLOW_GROWTH=true \
    TF_GPU_ALLOCATOR=cuda

# Install Python and runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        python${PYTHON_VERSION} \
        python3-pip \
        tini \
        && \
    # Create non-root user
    groupadd -g ${APP_GID} ${APP_GROUP} && \
    useradd -u ${APP_UID} -g ${APP_GROUP} -s /sbin/nologin ${APP_USER} && \
    # Create model cache directory
    mkdir -p ${MODEL_PATH} && \
    # Security hardening
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Copy wheels and install dependencies
WORKDIR /app
COPY --from=builder /app/wheels /app/wheels
COPY --from=builder /app/requirements.txt .

RUN pip install --no-cache-dir --no-index --find-links=/app/wheels -r requirements.txt && \
    rm -rf /app/wheels requirements.txt

# Copy application code
COPY . .

# Set proper permissions
RUN chown -R ${APP_USER}:${APP_GROUP} /app && \
    chmod -R 755 /app && \
    chmod -R 775 ${MODEL_PATH}

# Switch to non-root user
USER ${APP_USER}:${APP_GROUP}

# Configure container init and health check
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# Resource limits and security profiles
STOPSIGNAL SIGTERM