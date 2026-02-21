from pathlib import Path


def build_job_script(remote_dir: str, remote_audio_path: str) -> str:
    job_name = f"audio_{Path(remote_dir).name}"

    return f"""#!/bin/bash
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
