.PHONY: build run stop dev logs clean help

# Default target
help:
	@echo "AI Agent Marketplace - Docker Commands"
	@echo "======================================="
	@echo ""
	@echo "  make build    - Build Docker image"
	@echo "  make run      - Run the app in Docker"
	@echo "  make stop     - Stop the running container"
	@echo "  make dev      - Run in development mode (local npm)"
	@echo "  make logs     - View container logs"
	@echo "  make clean    - Remove containers and images"
	@echo ""

# Build the Docker image
build:
	@echo "🔨 Building Docker image..."
	docker-compose build

# Run the app in Docker
run:
	@echo "🚀 Starting AI Agent Marketplace..."
	docker-compose up -d
	@echo "✅ App running at http://localhost:3000"

# Stop the container
stop:
	@echo "🛑 Stopping containers..."
	docker-compose down

# Development mode (without Docker)
dev:
	@echo "🔧 Starting development server..."
	cd frontend && npm run dev

# View logs
logs:
	docker-compose logs -f frontend

# Clean up Docker resources
clean:
	@echo "🧹 Cleaning up..."
	docker-compose down -v --rmi local
	@echo "✅ Cleanup complete"

# Build and run in one command
up: build run

# Rebuild and restart
restart: stop build run
