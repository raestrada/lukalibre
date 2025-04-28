# Stage 1: Build dependencies and application
FROM python:3.11-slim AS builder

WORKDIR /app

# Install Poetry and dependencies
RUN pip install poetry==1.7.1 && \
    poetry config virtualenvs.create false

# Copy only dependency definition files first
COPY poetry.lock pyproject.toml ./

# Install dependencies
RUN poetry install --no-interaction --no-ansi --no-dev

# Copy the rest of the application
COPY . .

# Stage 2: Runtime stage using distroless for the app
FROM gcr.io/distroless/python3-debian12:nonroot AS app

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /app/app ./app
COPY --from=builder /app/alembic ./alembic
COPY --from=builder /app/alembic.ini ./

# The distroless nonroot image uses a non-root user by default
# with USER 65532:65532 (nonroot:nonroot)

# Set Python path
ENV PYTHONPATH=/app

# Expose the application port
EXPOSE 8000

# Command to run the application with uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Stage 3: Cloudflared sidecar
FROM debian:bullseye-slim AS cloudflared

# Install cloudflared and dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared \
    && chmod +x /usr/local/bin/cloudflared

# Create non-root user for running cloudflared
RUN groupadd -g 10001 cloudflared && \
    useradd -u 10001 -g cloudflared -s /bin/bash -m cloudflared

USER cloudflared

# This is a placeholder command - in production, the actual token and config will be provided via env vars
CMD ["/usr/local/bin/cloudflared", "tunnel", "--no-autoupdate", "run", "--token", "${CLOUDFLARE_TUNNEL_TOKEN}"]
