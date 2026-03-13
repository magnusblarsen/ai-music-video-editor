from app.api.router import api_router
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import logging

logging.basicConfig(level=logging.INFO)

logging.getLogger("asyncssh").setLevel(logging.WARNING)  # or CRITICAL
logging.getLogger("asyncio").setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

app = FastAPI(title="Video Generation API")
app.include_router(api_router)

app.mount("/api/media", StaticFiles(directory="media"), name="media")
