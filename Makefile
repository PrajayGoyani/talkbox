# Default app name (can be overridden via APP=backend or APP=frontend)
APP ?=

# Map shorthand names to full PM2 names
ifeq ($(APP),backend)
  APP_NAME := chat-app-backend
else ifeq ($(APP),frontend)
  APP_NAME := chat-app-frontend
else
  APP_NAME := $(APP)
endif

.PHONY: install up dev down status logs help

# Install dependencies for frontend and backend
install:
	@echo "Installing dependencies..."
	bun install
	@echo "Installation complete!"

# Unified build command (incremental)
build:
	@echo "Building applications..."
	cd backend && bun run build
	cd frontend && bun run build
	@echo "Build complete!"

# Production Mode (Backend: start, Frontend: build + preview)
up:
	@echo "Starting in PRODUCTION mode..."
	$(MAKE) build
	APP_MODE=prod bunx pm2 start ecosystem.config.cjs


# Development Mode (Backend: dev, Frontend: dev)
dev:
	@echo "Checking if services are already running..."
	@if bunx pm2 status | grep -q "online"; then \
		echo "Services are already running. Please run 'make down' first."; \
		exit 1; \
	fi
	@echo "Starting in DEVELOPMENT mode..."
	APP_MODE=dev bunx pm2 start ecosystem.config.cjs

# Stop and delete both services
down:
	@echo "Stopping services..."
	bunx pm2 delete ecosystem.config.cjs

# Show real-time statistics and health info
status:
	@echo "Showing status..."
	bunx pm2 status
# 	@echo "\nDetailed stats for Backend:"
# 	bunx pm2 describe chat-app-backend | grep -v "─" | grep -v "│" | head -n 25
# 	@echo "\nDetailed stats for Frontend:"
# 	bunx pm2 describe chat-app-frontend | grep -v "─" | grep -v "│" | head -n 25

# Tail logs for all services or a specific one
logs:
	bunx pm2 logs $(APP_NAME)

# Show help
help:
	@echo "Available commands:"
	@echo "  make install         - Install dependencies for backend and frontend"
	@echo "  make up              - Start in Production mode (Backend 'start', Frontend 'preview')"
	@echo "  make dev             - Start in Development mode (Backend 'dev', Frontend 'dev')"
	@echo "  make down            - Stop and remove both applications"
	@echo "  make status          - Show health and resource usage statistics"
	@echo "  make logs [APP=...]  - View real-time logs (optional: APP=backend|frontend)"
