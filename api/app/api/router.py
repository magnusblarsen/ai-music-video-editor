from fastapi import APIRouter

from app.api.routes import tasks, test

api_router = APIRouter(prefix="/api")

api_router.include_router(tasks.router)
api_router.include_router(test.router)
