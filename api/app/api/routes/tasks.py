from pathlib import Path
import uuid
import asyncio

from typing import Annotated
from fastapi import UploadFile, File, HTTPException, BackgroundTasks, APIRouter, BackgroundTasks
from dotenv import load_dotenv
from app.models import TaskState
from app.tasks import transition

from app.core.config import get_directories
from app.services.task_store import task_store
from app.services.slurm import stage_audio, run_slurm_job

router = APIRouter(tags=["tasks"])


@router.post("/upload-audio")
async def upload_audio(background_tasks: BackgroundTasks, file: Annotated[UploadFile, File()]):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio/*, got {file.content_type}")

    directories = get_directories()

    ext = Path(file.filename).suffix if file.filename else ""
    audio_id = str(uuid.uuid4())
    local_path = directories.staging / f"{audio_id}{ext}"

    task = task_store.create(audio_id)

    try:
        with local_path.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                out.write(chunk)
    finally:
        await file.close()

    background_tasks.add_task(
        stage_audio,
        audio_id=audio_id,
        local_path=str(local_path),
        ext=ext,
    )

    return task


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    load_dotenv()
    task = task_store.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    return task


@router.post("/run/{task_id}")
async def run_task(task_id: str, background_tasks: BackgroundTasks):
    task = task_store.require(task_id)

    if task.state in {TaskState.running, TaskState.queued}:
        return {"ok": True, "task_id": task_id, "state": task.state}

    background_tasks.add_task(run_slurm_job, task_id=task_id)

    return {"ok": True, "task_id": task_id}
