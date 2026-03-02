from pathlib import Path
from app.core.config import get_hpc_config, get_directories
from app.services.task_store import task_store
from app.services.hpc_client import HpcClient

from app.models import TaskState
from app.tasks import transition


async def run_slurm_job(task_id: str) -> None:
    """
    Background worker function:
    - Submit Slurm job
    - Update in-memory task status
    """
    directories = get_directories()
    settings = get_hpc_config()
    client = HpcClient(settings)

    task = task_store.require(task_id)

    remote_dir = f"{directories.hpc_tasks_base}/{task_id}"
    remote_job_script = f"{remote_dir}/job.sbatch"

    try:
        transition(task, TaskState.running, message="Submitting Slurm job", progress=0)

        submit_cmd = f"sbatch {remote_job_script}"

        result = await client.run(submit_cmd)

        job_id = result.strip().split()[-1]

        print(f"Submitted job {job_id} for audio {task_id}")

        transition(task, TaskState.running, message=f"Job submitted (ID: {job_id})", progress=50)

        # TODO: Poll job status
        # transition(task, TaskState.done, message=f"Job completed (ID: {job_id})", progress=100)
    except Exception as e:
        transition(task, TaskState.failed, message="Job submission failed", progress=100)
        task.error = str(e)


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

    remote_dir = f"{directories.hpc_tasks_base}/{audio_id}"
    remote_audio_path = f"{remote_dir}/input{ext}"
    remote_job_script = f"{remote_dir}/job.sbatch"

    try:
        transition(task, TaskState.staging, message="Uploading audio to HPC", progress=20)

        await client.mkdir(remote_dir)

        await client.sftp_put(local_path, remote_audio_path)

        job_contents = build_job_script(remote_dir=remote_dir, remote_audio_path=remote_audio_path)
        await client.sftp_put_text(job_contents, remote_job_script)

        transition(task, TaskState.ready, message="Uploaded Audio", progress=100)

    except Exception as e:
        transition(task, TaskState.failed, message="Upload failed", progress=100)
        task.error = str(e)


def build_job_script(remote_dir: str, remote_audio_path: str) -> str:
    job_name = f"audio_{Path(remote_dir).name}"

    return f"""#!/bin/bash
#SBATCH --job-name={job_name}
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
