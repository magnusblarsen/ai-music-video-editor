from pathlib import Path

from typing import Annotated
from fastapi import UploadFile, File, HTTPException, APIRouter, BackgroundTasks, Depends
from app.db import get_db
from app.repositories.task_repository import TaskRepository
from app.core.config import get_directories
from app.services.slurm import stage_audio, run_slurm_job


router = APIRouter(tags=["tasks"])


# TODO: don't create id manually
@router.post("/upload-audio")
async def upload_audio(background_tasks: BackgroundTasks, file: Annotated[UploadFile, File()], db=Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio/*, got {file.content_type}")

    directories = get_directories()

    ext = Path(file.filename).suffix if file.filename else ""

    repo = TaskRepository(db)
    task = repo.create()
    task_id = str(task.id)
    local_path = f"{directories.staging}/{task_id}{ext}"

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
        task_id=task_id,
        local_path=str(local_path),
        ext=ext,
    )

    return task


@router.get("/status/{task_id}")
async def get_status(task_id: str, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    return task


@router.post("/run/{task_id}")
async def run_task(task_id: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Not found")

    background_tasks.add_task(run_slurm_job, task_id=task_id)

    return {"ok": True, "task_id": task_id}
