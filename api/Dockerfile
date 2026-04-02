FROM python:3.11-slim

# Pull the uv binary from the official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# To prevent Python from writing .pyc files to disk and to ensure that Python
# output is sent straight to the terminal without buffering.
ENV PYTHONDONTWRITEBYTECODE=1 \ 
    PYTHONUNBUFFERED=1

WORKDIR /app

# Keep image lean while still supporting common Python package builds.
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Uncomment when ready for production.
# COPY ./app/ /app
COPY ./app/pyproject.toml /app

# Install dependencies only when available.
RUN uv pip install --system --no-cache .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
