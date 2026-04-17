up:
	cd infra/docker/compose && docker compose up --build -d

down:
	cd infra/docker/compose && docker compose down

fclean:
	cd infra/docker/compose && docker compose down -v --rmi all

test:
	cd infra/docker/compose && docker compose --profile test up --build

re: fclean up

.PHONY: up down fclean test
