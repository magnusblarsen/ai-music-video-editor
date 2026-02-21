from typing import Annotated
from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pathlib import Path
import uuid
import os
import asyncssh
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import TaskRecord, TaskState
from app.tasks import transition
from app.db import get_db

load_dotenv()

app = FastAPI(title="Video Generation API")

api = APIRouter(prefix="/api")


TASKS: dict[str, TaskRecord] = {}

STAGING_DIR = Path("/tmp/uploads")
STAGING_DIR.mkdir(parents=True, exist_ok=True)

HPC_HOST = os.getenv("HPC_HOST")
HPC_USER = os.getenv("HPC_USER")
HPC_REMOTE_BASE = os.getenv("HPC_REMOTE_BASE")
HPC_SSH_KEY = os.getenv("HPC_SSH_KEY")


@api.get("/health/db")
def db_health(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"ok": True}


@api.post("/test-ssh")
async def test_ssh():
    try:
        async with asyncssh.connect(
            HPC_HOST,
            username=HPC_USER,
            client_keys=[HPC_SSH_KEY],
            known_hosts=None,
        ) as conn:
            result = await conn.run("ls", check=True)
            return {"output": result.stdout}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SSH connection failed: {e}")


@api.post("/upload-audio")
async def upload_audio(background_tasks: BackgroundTasks, file: Annotated[UploadFile, File()]):
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail=f"Expected audio/*, got {file.content_type}")

    ext = Path(file.filename).suffix if file.filename else ""
    audio_id = str(uuid.uuid4())
    local_path = STAGING_DIR / f"{audio_id}{ext}"

    TASKS[audio_id] = TaskRecord(task_id=audio_id)

    try:
        with local_path.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                out.write(chunk)
    finally:
        await file.close()

    remote_dir = f"{HPC_REMOTE_BASE}/{audio_id}"
    remote_audio_path = f"{remote_dir}/input{ext}"
    remote_job_script = f"{remote_dir}/job.sbatch"

    background_tasks.add_task(
        _stage_audio,
        audio_id=audio_id,
        local_path=str(local_path),
        remote_dir=remote_dir,
        remote_audio_path=remote_audio_path,
        remote_job_script=remote_job_script,
    )

    return TASKS[audio_id]


async def _download_from_hpc(remote_path: str, local_path: str):
    async with asyncssh.connect(
        HPC_HOST,
        username=HPC_USER,
        client_keys=[HPC_SSH_KEY],
        known_hosts=None,
    ) as conn:
        async with conn.start_sftp_client() as sftp:
            await sftp.get(remote_path, local_path)


@api.get("/status/{audio_id}")
async def get_status(audio_id: str):
    if audio_id == os.getenv("AUDIO_ID_FOR_TEST"):
        return TaskRecord(task_id=audio_id, state=TaskState.staging, progress=100)

    task = TASKS.get(audio_id)
    if not task:
        raise HTTPException(status_code=404, detail="Not found")
    return task


async def _stage_audio(
    audio_id: str,
    local_path: str,
    remote_dir: str,
    remote_audio_path: str,
    remote_job_script: str,
):
    task = TASKS[audio_id]

    try:
        transition(task, TaskState.staging, message="Uploading audio to HPC", progress=20)

        await _upload(
            local_path,
            remote_dir,
            remote_audio_path,
            remote_job_script,
        )

        transition(task, TaskState.ready, message="Uploaded Audio", progress=100)

    except Exception as e:
        transition(task, TaskState.failed, message="Upload failed")
        task.error = str(e)


async def _upload(local_path: str, remote_dir: str, remote_audio_path: str, remote_job_script: str):
    job_contents = f"""#!/bin/bash
#SBATCH --job-name=audio_{Path(remote_dir).name}
#SBATCH --output={remote_dir}/clap-%j.out
#SBATCH --error={remote_dir}/clap-%j.err
#SBATCH --time=04:00:00
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --partition=dgx1
#SBATCH --cpus-per-task=8 # 16
#SBATCH --mem=32G # 96G


set -euo pipefail

echo "Running on $(hostname)"
echo "Input: {remote_audio_path}"
nvidia-smi

source /usr/local/minicondas/Miniconda3-py312_25.9.1-3-Linux-aarch64/etc/profile.d/conda.sh
conda activate /home/brml/DGX1/mycondas/gpu312

cd /home/brml/LTX-2-test
python main.py

# python /path/to/your_pipeline.py --audio "{remote_audio_path}" --out "{remote_dir}/out"

"""

    async with asyncssh.connect(
        HPC_HOST,
        username=HPC_USER,
        client_keys=[HPC_SSH_KEY],
        known_hosts=None,
    ) as conn:
        await conn.run(f"mkdir -p {remote_dir}", check=True)

        # SFTP upload
        async with conn.start_sftp_client() as sftp:
            await sftp.put(local_path, remote_audio_path)

            tmp_local_job = Path("/tmp") / f"job_{uuid.uuid4()}.sbatch"
            tmp_local_job.write_text(job_contents, encoding="utf-8")
            await sftp.put(str(tmp_local_job), remote_job_script)
            tmp_local_job.unlink(missing_ok=True)


app.include_router(api)
