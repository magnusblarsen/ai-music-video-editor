migrate:
	docker compose exec api alembic revision --autogenerate -m "$(m)"

upgrade:
	docker compose exec api alembic upgrade head
