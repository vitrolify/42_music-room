up:
	cd infra/docker/compose && docker compose --env-file ../../../.env up --build -d

down:
	cd infra/docker/compose && docker compose --env-file ../../../.env down

fclean:
	cd infra/docker/compose && docker compose --env-file ../../../.env down -v --rmi all

test:
	cd infra/docker/compose && docker compose --env-file ../../../.env --profile test run --rm k6

re: fclean up

migration:
	@read -p "Enter migration message: " msg; \
	cd infra/docker/compose && docker compose --env-file ../../../.env run --rm migration-generator alembic revision --autogenerate -m "$$msg"

.PHONY: up down fclean test migration
