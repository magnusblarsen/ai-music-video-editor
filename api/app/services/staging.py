from app.core.config import get_hpc_config, get_directories
from app.services.task_store import task_store
from app.services.hpc_client import HpcClient
from app.services.slurm import build_job_script

from app.models import TaskState
from app.tasks import transition


async def stage_audio(audio_id: str, local_path: str, ext: str) -> None:
    """
    Background worker function:
    - Upload audio file to HPC
    - Upload Slurm job script
    - Update in-memory task status
    """
    directories = get_directories()
    settings = get_hpc_config()
    client = HpcClient(settings)

    task = task_store.require(audio_id)

    remote_dir = f"{directories.hpc_remote_base}/{audio_id}"
    remote_audio_path = f"{remote_dir}/input{ext}"
    remote_job_script = f"{remote_dir}/job.sbatch"

    try:
        transition(task, TaskState.staging, message="Uploading audio to HPC", progress=20)

        await client.mkdir(remote_dir)

        # Upload audio
        await client.sftp_put(local_path, remote_audio_path)

        # Upload job script
        job_contents = build_job_script(remote_dir=remote_dir, remote_audio_path=remote_audio_path)
        await client.sftp_put_text(job_contents, remote_job_script)

        transition(task, TaskState.ready, message="Uploaded Audio", progress=100)

    except Exception as e:
        transition(task, TaskState.failed, message="Upload failed", progress=100)
        task.error = str(e)
