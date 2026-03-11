import os
from pathlib import Path
from dotenv import load_dotenv
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    hpc_host: str
    hpc_user: str
    known_hosts: str | None
    hpc_ssh_key: str


@dataclass(frozen=True)
class Directories:
    media: Path
    hpc_base: Path


def get_hpc_config() -> Settings:
    load_dotenv()

    hpc_host = os.getenv("HPC_HOST")
    hpc_user = os.getenv("HPC_USER")
    hpc_ssh_key = os.getenv("HPC_SSH_KEY")

    if not hpc_host or not hpc_user or not hpc_ssh_key:
        raise RuntimeError("Missing some variable")

    return Settings(
        hpc_host=hpc_host,
        hpc_user=hpc_user,
        known_hosts=None,
        hpc_ssh_key=hpc_ssh_key,
    )


def get_directories() -> Directories:
    media_dir = Path("/app/media")
    media_dir.mkdir(parents=True, exist_ok=True)

    load_dotenv()

    hpc_remote_base = os.getenv("HPC_BASE")
    if not hpc_remote_base:
        raise ValueError("HPC_TASKS_BASE environment variable is not set")

    return Directories(
        media=media_dir,
        hpc_base=Path(hpc_remote_base),
    )
