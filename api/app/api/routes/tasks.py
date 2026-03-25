from pathlib import Path

from typing import Annotated
from fastapi import UploadFile, File, HTTPException, APIRouter, BackgroundTasks, Depends
from app.db import get_db
from app.repositories.task_repository import TaskRepository
from app.core.config import get_directories
from app.services.slurm import stage_audio, run_and_poll_task, poll_video_segments, poll_and_store_videos, compose_videos_on_timeline, run_and_poll_scene_task
from app.models import TaskState
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.schemas.track import TrackRead
from app.schemas.task import GenerateVideosRequest, RegenerateVideoRequest

from app.models import Track, Clip


router = APIRouter(tags=["tasks"])


@router.get("/tasks")
async def get_tasks(db=Depends(get_db)):
    repo = TaskRepository(db)
    return repo.list()


@router.post("/upload-audio")
async def upload_audio(background_tasks: BackgroundTasks, file: Annotated[UploadFile, File()], db=Depends(get_db)):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio/*, got {file.content_type}")

    directories = get_directories()

    ext = Path(file.filename).suffix if file.filename else ""

    repo = TaskRepository(db)
    task = repo.create()
    task_id = str(task.id)
    local_path = directories.media / f"{task_id}{ext}"

    try:
        with local_path.open("wb") as out:
            print("Saving file to:", local_path)
            print("Resolved path:", local_path.resolve())
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                out.write(chunk)
        db.commit()

        background_tasks.add_task(
            stage_audio,
            task_id=task_id,
            local_path=str(local_path),
            ext=ext,
        )

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
    finally:
        await file.close()

    return task


@router.get("/status/{task_id}")
async def get_status(task_id: int, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    return task


@router.post("/run/{task_id}")
async def run_task(task_id: str, body: GenerateVideosRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    if task.state not in {TaskState.ready, TaskState.failed}:
        raise HTTPException(status_code=400, detail=f"Task not ready to run (current state: {task.state})")

    repo.update_state(
        task_id,
        state=TaskState.running,
        message="Submitting Slurm job",
        progress=0,
    )
    db.commit()

    background_tasks.add_task(run_and_poll_task, task_id=task_id, additional_prompt=body.additional_prompt)

    return {"ok": True, "task_id": task_id}


@router.post("/tasks/{task_id}/poll-segments")
async def start_polling(task_id: int, background_tasks: BackgroundTasks, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)

    if task.state not in {TaskState.running, TaskState.failed}:
        raise HTTPException(status_code=400, detail=f"Task not running (current state: {task.state})")

    stmt = (
        select(Track)
        .where(Track.task_id == task_id)
        .options(selectinload(Track.clips))
    )

    tracks = db.scalars(stmt).all()
    if tracks:
        raise HTTPException(status_code=400, detail="Tracks already exist for this task")
    if not task:
        raise HTTPException(status_code=404, detail="Not found")

    background_tasks.add_task(poll_video_segments, task_id=task_id)

    return {"ok": True, "task_id": task_id}


@router.get("/tasks/{task_id}/tracks", response_model=list[TrackRead])
async def get_tracks(task_id: int, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")

    stmt = (
        select(Track)
        .where(Track.task_id == task_id)
        .options(selectinload(Track.clips))
    )

    tracks = db.scalars(stmt).all()

    return tracks


# NOTE: one small problem: May poll the same videos concurrently if multiple requests.
@router.post("/tasks/{task_id}/poll-videos")
async def poll_videos(task_id: int, background_tasks: BackgroundTasks, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)

    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    if task.state not in {TaskState.videos_segmented, TaskState.failed, TaskState.done}:
        raise HTTPException(status_code=400, detail=f"Task not ready to poll videos (current state: {task.state})")

    background_tasks.add_task(poll_and_store_videos, task_id=task_id)

    return {"ok": True, "task_id": task_id}


@router.post("/tasks/{task_id}/concat")
def concat_videos(task_id: int, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")

    stmt = (
        select(Clip)
        .join(Clip.track)
        .where(Track.task_id == task_id)
        .order_by(Clip.clip_index)
    )

    clips = db.scalars(stmt).all()
    output_path = get_directories().media / str(task_id) / "final_video.mp4"

    audio_path = get_directories().media / f"{task_id}.mp3"

    # output = concatenate_videos(clips, output_path=output_path)
    output = compose_videos_on_timeline(clips, audio_path=audio_path, output_path=output_path)
    return {"output": output}


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db=Depends(get_db)):
    repo = TaskRepository(db)
    task = repo.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")

    repo.delete(task_id)
    db.commit()
    return {"ok": True}


@router.post("/clips/{clip_id}/regenerate")
def regenerate_clip(clip_id: int, body: RegenerateVideoRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):
    stmt = select(Clip).where(Clip.id == clip_id)
    clip = db.scalars(stmt).first()
    if not clip:
        raise HTTPException(status_code=404, detail="Not found")

    clip.aesthetics = body.aesthetics
    clip.camera_movement = body.camera_movement
    clip.script_description = body.script_description
    db.commit()
    db.refresh(clip)

    prompt = f"{clip.script_description}. {clip.aesthetics}. {clip.camera_movement}."

    destination_folder = get_directories().media / str(clip.track.task_id) / f"clip_{clip.clip_index + 1}"
    background_tasks.add_task(run_and_poll_scene_task, task_id=clip.track.task_id, clip_id=clip_id, scene_number=clip.clip_index, prompt=prompt, duration_seconds=clip.duration_seconds, destination_folder=destination_folder)

    return {"ok": True}
