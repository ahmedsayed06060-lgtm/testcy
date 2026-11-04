.PHONY: dev prod down migrate seed lint test build build-tools keys
COMPOSE=docker compose -f docker-compose.yml

keys:
	python3 backend/scripts/generate_keys.py

dev: keys
	$(COMPOSE) up --build

prod:
	docker compose -f docker-compose.prod.yml up --build -d

down:
	$(COMPOSE) down

migrate:
	$(COMPOSE) run --rm backend alembic upgrade head

seed:
	$(COMPOSE) run --rm backend python -m scripts.seed

lint:
	cd backend && ruff check app tests alembic && ruff format --check app tests alembic
	cd frontend && npm run lint && npm run typecheck

test:
	cd backend && pytest
	cd frontend && npm test && npm run build

build:
	$(COMPOSE) build
	cd frontend && npm run build

build-tools:
	docker build -t cyberops-nmap tool-images/nmap
	docker build -t cyberops-testssl tool-images/testssl
	docker build -t cyberops-nuclei tool-images/nuclei
	docker build -t cyberops-zap tool-images/zap
	docker build -t cyberops-mobsf tool-images/mobsf
	docker build -t cyberops-osint tool-images/osint
