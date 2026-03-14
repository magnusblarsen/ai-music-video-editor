from pathlib import Path
from app.core.config import get_hpc_config, get_directories
from app.services.hpc_client import HpcClient
from app.db import SessionLocal
from app.repositories.task_repository import TaskRepository
from app.models import Clip, Track
from pathlib import Path
import logging

from app.models import TaskState

import asyncio
import json
import shlex

logger = logging.getLogger(__name__)


def _set_task_state(
    task_id: int,
    state: TaskState,
    message: str,
    progress: int,
    error: str | None = None,
) -> None:
    with SessionLocal() as db:
        repo = TaskRepository(db)
        repo.update_state(
            task_id,
            state=state,
            message=message,
            progress=progress,
            error=error,
        )
        db.commit()


async def run_and_poll_task(task_id: int) -> None:

    db = SessionLocal()
    try:
        repo = TaskRepository(db)
        repo.update_state(
            task_id,
            state=TaskState.running,
            message="Submitting Slurm job",
            progress=0,
        )
        db.commit()
    finally:
        db.close()

    await run_slurm_job(task_id=task_id)

    await poll_video_segments(
        task_id=task_id,
    )

    await poll_and_store_videos(task_id)


async def run_slurm_job(task_id: int) -> None:
    directories = get_directories()
    settings = get_hpc_config()
    db = SessionLocal()

    try:
        repo = TaskRepository(db)

        async with HpcClient(settings) as client:
            remote_dir = f"{directories.hpc_base}/uploads/{task_id}"
            remote_job_script = f"{remote_dir}/job.sbatch"

            files_in_dir = await client.run(f"ls -1 {remote_dir}")

            audio_file = next(
                (
                    line
                    for line in files_in_dir.splitlines()
                    if line.strip().endswith((".wav", ".mp3"))
                ),
                None,
            )
            if not audio_file:
                raise FileNotFoundError("No audio file found in remote directory")

            remote_audio_path = f"{remote_dir}/{audio_file.strip()}"
            job_contents = build_job_script(
                remote_dir=remote_dir,
                remote_audio_path=remote_audio_path,
            )
            await client.sftp_put_text(job_contents, remote_job_script)

            result = await client.run(f"sbatch {remote_job_script}")
            job_id = result.strip().split()[-1]

            repo.update_state(
                task_id,
                state=TaskState.running,
                message=f"Job submitted (ID: {job_id})",
                progress=50,
                job_id=job_id,
            )
            db.commit()

    except Exception as e:
        try:
            repo.update_state(
                task_id,
                state=TaskState.failed,
                message="Job submission failed",
                progress=100,
                error=str(e),
            )
        except Exception:
            pass
    finally:
        db.close()


async def stage_audio(task_id: str, local_path: str, ext: str) -> None:
    """
    Background worker function:
    - Upload audio file to HPC
    - Upload Slurm job script
    - Update in-memory task status
    """
    directories = get_directories()
    settings = get_hpc_config()
    db = SessionLocal()

    try:
        repo = TaskRepository(db)

        remote_dir = f"{directories.hpc_base}/uploads/{task_id}"
        remote_audio_path = f"{remote_dir}/input{ext}"
        client = HpcClient(settings)
        async with HpcClient(settings) as client:
            repo.update_state(
                task_id,
                state=TaskState.staging,
                message="Uploading audio to HPC",
                progress=20,
            )
            db.commit()

            await client.mkdir(remote_dir)
            await client.sftp_put(local_path, remote_audio_path)

            repo.update_state(
                task_id,
                state=TaskState.ready,
                message="Uploaded Audio",
                progress=100
            )
            db.commit()

    except Exception as e:
        repo.update_state(
            task_id,
            state=TaskState.failed,
            message="Upload failed",
            progress=100,
            error=str(e)
        )
        db.commit()
    finally:
        db.close()


def build_job_script(remote_dir: str, remote_audio_path: str) -> str:
    job_name = f"audio_{Path(remote_dir).name}"

    return f"""#!/bin/bash
#SBATCH --job-name={job_name}
#SBATCH --output={remote_dir}/clap-%j.out
#SBATCH --error={remote_dir}/clap-%j.err
#SBATCH --time=12:00:00
#SBATCH --ntasks=1
#SBATCH --nodes=1
#SBATCH --partition=dgx1
#SBATCH --cpus-per-task=8 # 16
#SBATCH --mem=48G # 96G


set -euo pipefail

TEST_RUN_NAME="test_run_{Path(remote_dir).name}"
AUDIO_PATH="{remote_audio_path}"
RUN_DESCRIPTION="LALM test"
ADDITIONAL_PROMPT="The story should have at least one plot twist."
FORCED_VIDEO_PROMPT=""

echo "Running on $(hostname)"
nvidia-smi

source /usr/local/minicondas/Miniconda3-py312_25.9.1-3-Linux-aarch64/etc/profile.d/conda.sh
conda activate /home/brml/DGX1/mycondas/gpu312

# TODO: delete?
# module load cuda/12.6.3 latex/TexLive24 ffmpeg/7.0.1 cudnn/v9.6.0.74-prod-cuda-12.X


cd /home/brml/Music-Visualization-Generation-Pipeline

echo "Running main.py with variables: $TEST_RUN_NAME, $AUDIO_PATH, $RUN_DESCRIPTION, $ADDITIONAL_PROMPT, $FORCED_VIDEO_PROMPT"

python src/main.py "$TEST_RUN_NAME" "$AUDIO_PATH" "$RUN_DESCRIPTION" "$ADDITIONAL_PROMPT" "$FORCED_VIDEO_PROMPT"
"""


async def poll_video_segments(
    task_id: int,
    poll_interval_seconds: float = 30.0,
    timeout_seconds: float = 60 * 30,
) -> None:
    settings = get_hpc_config()
    directories = get_directories()
    result_file = directories.hpc_base / "Music-Visualization-Generation-Pipeline" / "outputs" / f"test_run_{str(task_id)}" / "segments.json"

    try:
        file_contents = await _wait_for_remote_file(
            settings=settings,
            remote_result_file=result_file,
            poll_interval_seconds=poll_interval_seconds,
            timeout_seconds=timeout_seconds,
        )

        payload = json.loads(file_contents)

        if not isinstance(payload, list):
            raise ValueError("JSON is not a list")

        with SessionLocal() as db:
            repo = TaskRepository(db)

            track = Track(task_id=task_id)

            for item in payload:
                index = item.get("index")
                start = item.get("start")
                end = item.get("end")
                duration = item.get("duration")
                audio_clip = item.get("audio_clip")  # TODO: not needed?

                script = item.get("script")
                description = script.get("description")
                aesthetics = script.get("aesthetics")
                camera_movement = script.get("camera_movement")

                track.clips.append(
                    Clip(
                        clip_index=index,
                        start_seconds=start,
                        end_seconds=end,
                        duration_seconds=duration,
                        url=None,
                        script_description=description,
                        aesthetics=aesthetics,
                        camera_movement=camera_movement,
                    )
                )

            db.add(track)

            repo.update_state(
                task_id,
                state=TaskState.videos_segmented,
                message=f"Created 1 track with {len(track.clips)} clips",
                progress=60,
            )
            db.commit()

    except TimeoutError as e:
        _set_task_state(
            task_id,
            state=TaskState.failed,
            message="Timed out waiting for remote result file",
            progress=100,
            error=str(e),
        )
        raise

    except Exception as e:
        _set_task_state(
            task_id,
            state=TaskState.failed,
            message="Failed to create tracks from remote result file",
            progress=100,
            error=str(e),
        )
        raise


async def _wait_for_remote_file(
    settings,
    remote_result_file: Path,
    poll_interval_seconds: float,
    timeout_seconds: float,
) -> str:
    elapsed = 0.0

    quoted_path = shlex.quote(str(remote_result_file))

    async with HpcClient(settings) as client:
        while elapsed < timeout_seconds:
            exists = (await client.run(f"test -f {quoted_path} && echo 1 || echo 0")).strip()

            if exists == "1":
                logger.info(f"Remote file found: {remote_result_file} (elapsed: {elapsed:.1f}s)")
                return await client.run(f"cat {quoted_path}")

            logger.info(f"Remote file not found yet: {remote_result_file} (elapsed: {elapsed:.1f}s)")
            await asyncio.sleep(poll_interval_seconds)
            elapsed += poll_interval_seconds

    raise TimeoutError(
        f"Remote file not found after {timeout_seconds} seconds: {remote_result_file}"
    )


async def wait_for_slurm_completion(
    task_id: int,
    job_id: str,
    poll_interval_seconds: float = 30.0,
    timeout_seconds: float = 60 * 60 * 12,
) -> None:
    settings = get_hpc_config()
    elapsed = 0.0

    terminal_success = {"COMPLETED"}
    terminal_failure = {"FAILED", "CANCELLED", "TIMEOUT", "OUT_OF_MEMORY"}

    async with HpcClient(settings) as client:
        while elapsed < timeout_seconds:
            cmd = (f"sacct -j {shlex.quote(job_id)} --format=JobIDRaw,State --parsable2 --noheader")

            output = (await client.run(cmd)).strip().upper()

            state = None
            for line in output.splitlines():
                parts = line.split("|")
                if len(parts) != 2:
                    continue
                job_id_raw, state_str = parts
                if job_id_raw == job_id:
                    state = job_id_raw.strip().upper()
                    break

            logger.info("Slurm job %s state=%s", job_id, state)

            if state in terminal_success:
                logger.info("Slurm job %s completed successfully", job_id)
                return

            if state in terminal_failure:
                raise RuntimeError(f"Slurm job ended in failure state: {state}")

            await asyncio.sleep(poll_interval_seconds)
            elapsed += poll_interval_seconds

    raise TimeoutError(f"Timed out waiting for Slurm job {job_id} to complete")


async def poll_and_store_videos(task_id: int) -> None:
    settings = get_hpc_config()
    directories = get_directories()

    remote_output_dir = (
        Path(directories.hpc_base)
        / "Music-Visualization-Generation-Pipeline"
        / "intermediate_files"
        / f"test_run_{task_id}"
    )

    # TODO: make sure segments.json is only created in the end
    remote_manifest = remote_output_dir / "segments.json"

    try:
        manifest_text = await _wait_for_remote_file(
            settings=settings,
            remote_result_file=remote_manifest,
            poll_interval_seconds=30.0,
            timeout_seconds=60 * 30,
        )

        payload = json.loads(manifest_text)
        if not isinstance(payload, list):
            raise ValueError("segments.json is not a list")

        local_media_dir = Path(directories.media) / str(task_id)
        local_media_dir.mkdir(parents=True, exist_ok=True)

        async with HpcClient(settings) as client:
            for item in payload:
                clip_index = item["index"]

                file_name = f"scene-{clip_index + 1}.mp4"
                remote_file = remote_output_dir / file_name

                local_file = local_media_dir / file_name

                logger.info("Downloading video for clip_index=%s from %s to %s", clip_index, remote_file, local_file)
                await client.sftp_get(str(remote_file), str(local_file))

                with SessionLocal() as db:
                    clip = (
                        db.query(Clip)
                        .join(Track)
                        .filter(Track.task_id == task_id, Clip.clip_index == clip_index)
                        .one_or_none()
                    )
                    if clip is None:
                        logger.warning("No clip found for task=%s clip_index=%s", task_id, clip_index)
                        continue

                    clip.url = str(local_file)
                    db.commit()

        _set_task_state(
            task_id,
            state=TaskState.done,
            message="Videos downloaded and clip URLs updated",
            progress=100,
        )
    except Exception as e:
        _set_task_state(
            task_id,
            state=TaskState.failed,
            message="Failed to download videos and update clip URLs",
            progress=100,
            error=str(e),
        )
        raise
