up:
	cd infra/docker/compose && docker compose --env-file ../../../.env up --build -d

down:
	cd infra/docker/compose && docker compose --env-file ../../../.env down

fclean:
	cd infra/docker/compose && docker compose --env-file ../../../.env down -v --rmi all

test:
	@echo "Starting isolated test environment in the background..."
	cd infra/docker/compose && docker compose -f docker-compose.test.yml up -d --build api-test
	@echo "Running k6 load test..."
	-cd infra/docker/compose && docker compose -f docker-compose.test.yml run --rm k6
	@echo "Cleaning up test environment..."
	cd infra/docker/compose && docker compose -f docker-compose.test.yml down -v --remove-orphans

re: fclean up

migration:
	@read -p "Enter migration message: " msg; \
	cd infra/docker/compose && docker compose --env-file ../../../.env run --rm migration-generator alembic revision --autogenerate -m "$$msg"

psql:
	cd infra/docker/compose && docker compose exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'

ruff:
	uvx ruff check .

web:
	./scripts/build-web.sh
	cd infra/docker/compose && docker compose --env-file ../../../.env up -d --no-deps --force-recreate nginx

android:
	test -d frontend/android || (cd frontend && npx expo prebuild --platform android)
	./scripts/build-android.sh

.PHONY: up down fclean test re migration psql ruff web android
