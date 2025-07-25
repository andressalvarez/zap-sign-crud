# Django backend Dockerfile
FROM python:3.12-slim

# Python configuration
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements first for better caching
COPY pyproject.toml ./
RUN pip install django==4.2 \
    djangorestframework==3.16.0 \
    django-environ==0.12.0 \
    psycopg2-binary==2.9.10 \
    django-cors-headers==4.7.0 \
    drf-spectacular==0.28.0 \
    requests==2.32.4

# Copy project files
COPY . .

# Create non-root user
RUN groupadd -r django && useradd -r -g django django
RUN chown -R django:django /app
USER django

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/docs/ || exit 1

# Run application with hot reload
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
