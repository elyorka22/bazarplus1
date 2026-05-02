.PHONY: up down logs ps build-api build-web

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f api worker

ps:
	docker compose ps

build-api:
	cd api && npm ci && npm run build

build-web:
	cd web && npm ci && npm run build
