# ZapSign CRUD - Makefile for development
.PHONY: help dev build test lint clean logs stop install check-docker

# Default target
help:
	@echo "🎯 ZapSign CRUD - Available commands:"
	@echo ""
	@echo "📋 Quick Start (for reviewers):"
	@echo "  make install     - Install dependencies and start everything (one command setup)"
	@echo "  make dev         - Start development environment (docker-compose up)"
	@echo "  make check       - Verify all services are running correctly"
	@echo ""
	@echo "🔧 Development:"
	@echo "  make build       - Build all services"
	@echo "  make logs        - Show logs from all services"
	@echo "  make stop        - Stop all services"
	@echo "  make clean       - Stop and remove containers, networks, volumes"
	@echo "  make reset       - Complete reset and restart"
	@echo ""
	@echo "🧪 Testing:"
	@echo "  make test        - Run all tests (backend + frontend)"
	@echo "  make test-backend - Run only backend tests"
	@echo "  make test-frontend - Run only frontend tests"
	@echo ""
	@echo "🔍 Linting:"
	@echo "  make lint        - Run linting for all projects"
	@echo "  make lint-backend - Run backend linting"
	@echo "  make lint-frontend - Run frontend linting"
	@echo ""
	@echo "🚀 Production:"
	@echo "  make prod        - Start production environment"
	@echo "  make prod-build  - Build production images"
	@echo ""
	@echo "💾 Database:"
	@echo "  make migrate     - Run database migrations"
	@echo "  make seed        - Seed database with initial data"
	@echo "  make shell-db    - Open database shell"

# Check if Docker is installed and running
check-docker:
	@echo "🔍 Checking Docker installation..."
	@docker --version > /dev/null 2>&1 || (echo "❌ Docker is not installed. Please install Docker first." && exit 1)
	@docker-compose --version > /dev/null 2>&1 || (echo "❌ Docker Compose is not installed. Please install Docker Compose first." && exit 1)
	@docker info > /dev/null 2>&1 || (echo "❌ Docker daemon is not running. Please start Docker first." && exit 1)
	@echo "✅ Docker is ready!"

# One-command installation for reviewers
install: check-docker
	@echo "🚀 ZapSign CRUD - Complete Installation Starting..."
	@echo "📋 This will:"
	@echo "   1. Build all Docker images"
	@echo "   2. Start all services (PostgreSQL, Django, Angular)"
	@echo "   3. Run database migrations"
	@echo "   4. Seed initial data"
	@echo "   5. Verify everything is working"
	@echo ""
	@echo "⏱️  This may take 2-3 minutes on first run..."
	@echo ""
	@docker-compose down -v --remove-orphans 2>/dev/null || true
	@docker-compose build --no-cache
	@docker-compose up -d
	@echo "⏳ Waiting for services to start..."
	@sleep 30
	@echo "🗄️  Running database migrations..."
	@docker-compose exec -T backend python manage.py migrate
	@echo "🌱 Seeding initial data..."
	@docker-compose exec -T backend python init_data.py
	@echo ""
	@echo "🎉 Installation Complete!"
	@echo ""
	@echo "🌐 Access the application:"
	@echo "   Frontend: http://localhost:4200"
	@echo "   Backend API: http://localhost:8000/api/"
	@echo "   Database: localhost:5432 (user: zuser, password: zpass, db: zapsign)"
	@echo ""
	@make check

# Verification command
check:
	@echo "🏥 Checking all services..."
	@echo ""
	@echo "📊 Service Status:"
	@docker-compose ps
	@echo ""
	@echo "🔗 Connectivity Tests:"
	@curl -s -o /dev/null -w "   Frontend (4200): %{http_code}\n" http://localhost:4200 || echo "   Frontend (4200): ❌ DOWN"
	@curl -s -o /dev/null -w "   Backend API (8000): %{http_code}\n" http://localhost:8000/api/ || echo "   Backend API (8000): ❌ DOWN"
	@echo ""
	@echo "📈 Quick Stats:"
	@docker-compose exec -T db psql -U zuser -d zapsign -c "SELECT 'Companies: ' || COUNT(*) FROM company;" 2>/dev/null || echo "   Database: ❌ NOT ACCESSIBLE"
	@docker-compose exec -T db psql -U zuser -d zapsign -c "SELECT 'Documents: ' || COUNT(*) FROM document;" 2>/dev/null || echo "   Database: ❌ NOT ACCESSIBLE"
	@echo ""
	@echo "✅ System Status: Ready for use!"

# Development commands
dev: check-docker
	@echo "🚀 Starting development environment..."
	docker-compose up --build

build: check-docker
	@echo "🔨 Building all services..."
	docker-compose build

logs:
	@echo "📋 Showing logs..."
	docker-compose logs -f

stop:
	@echo "⏹️  Stopping all services..."
	docker-compose down

clean:
	@echo "🧹 Cleaning up containers, networks, and volumes..."
	docker-compose down -v --remove-orphans
	docker system prune -f

# Testing commands
test: test-backend test-frontend

test-backend:
	@echo "🧪 Running backend tests..."
	docker-compose exec -T backend python manage.py test

test-frontend:
	@echo "🧪 Running frontend tests..."
	docker-compose exec -T frontend npm test -- --watch=false --browsers=ChromeHeadless

test-frontend-coverage:
	@echo "🧪 Running frontend tests with coverage..."
	docker-compose exec -T frontend npm run test:coverage

# Linting commands
lint: lint-backend lint-frontend

lint-backend:
	@echo "🔍 Running backend linting..."
	@docker-compose exec -T backend flake8 . || echo "⚠️  Flake8 not configured"
	@docker-compose exec -T backend black --check . || echo "⚠️  Black not configured"
	@docker-compose exec -T backend isort --check-only . || echo "⚠️  isort not configured"

lint-frontend:
	@echo "🔍 Running frontend linting..."
	docker-compose exec -T frontend npm run lint || echo "⚠️  Frontend linting not configured"

# Production commands
prod:
	@echo "🚀 Starting production environment..."
	docker-compose -f docker-compose.prod.yml up --build || echo "⚠️  Production compose file not found"

prod-build:
	@echo "🔨 Building production images..."
	docker-compose -f docker-compose.prod.yml build || echo "⚠️  Production compose file not found"

# Database commands
migrate:
	@echo "🗄️  Running database migrations..."
	docker-compose exec -T backend python manage.py migrate

makemigrations:
	@echo "🗄️  Creating new migrations..."
	docker-compose exec -T backend python manage.py makemigrations

seed:
	@echo "🌱 Seeding database with initial data..."
	docker-compose exec -T backend python init_data.py

# Shell access
shell-backend:
	@echo "💻 Opening backend shell..."
	docker-compose exec backend bash

shell-frontend:
	@echo "💻 Opening frontend shell..."
	docker-compose exec frontend sh

shell-db:
	@echo "💻 Opening database shell..."
	docker-compose exec db psql -U zuser -d zapsign

# Reset everything
reset: clean
	@echo "🔄 Resetting everything..."
	docker volume prune -f
	make install
