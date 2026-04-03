.PHONY: up dev down restart status logs help

# Production Mode (Backend: start, Frontend: build + preview)
up:
	@echo "Starting in PRODUCTION mode (building frontend first)..."
	cd front-end && bun run build
	APP_MODE=prod bunx pm2 start ecosystem.config.cjs

# Development Mode (Backend: dev, Frontend: dev)
dev:
	@echo "Starting in DEVELOPMENT mode..."
	APP_MODE=dev bunx pm2 start ecosystem.config.cjs

# Stop and delete both services
down:
	@echo "Stopping services..."
	bunx pm2 delete ecosystem.config.cjs

# Restart both services (preserves current mode)
restart:
	@echo "Restarting services..."
	bunx pm2 restart ecosystem.config.cjs

# Show real-time statistics and health info
status:
	@echo "Showing status..."
	bunx pm2 status
	@echo "\nDetailed stats for Backend:"
	bunx pm2 describe chat-app-backend | grep -v "─" | grep -v "│" | head -n 25
	@echo "\nDetailed stats for Frontend:"
	bunx pm2 describe chat-app-frontend | grep -v "─" | grep -v "│" | head -n 25

# Tail logs for all services
logs:
	bunx pm2 logs

# Show help
help:
	@echo "Available commands:"
	@echo "  make up          - Start in Production mode (Backend 'start', Frontend 'preview')"
	@echo "  make dev         - Start in Development mode (Backend 'dev', Frontend 'dev')"
	@echo "  make down        - Stop and remove both applications"
	@echo "  make restart     - Restart both applications"
	@echo "  make status      - Show health and resource usage statistics"
	@echo "  make logs        - View real-time logs"
