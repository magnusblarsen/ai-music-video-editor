from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router

app = FastAPI(title="Video Generation API")
app.include_router(api_router)

# Dev
app.mount("/api/media", StaticFiles(directory="media"), name="media")
