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
    staging: Path
    hpc_remote_base: Path


def get_hpc_config() -> Settings:
    load_dotenv()

    hpc_host = os.getenv("HPC_HOST")
    hpc_user = os.getenv("HPC_USER")
    hpc_ssh_key = os.getenv("HPC_SSH_KEY")

    if not hpc_host or not hpc_user or not hpc_ssh_key:
        raise RuntimeError("Missing HPC_HOST/HPC_USER/HPC_SSH_KEY")

    return Settings(
        hpc_host=hpc_host,
        hpc_user=hpc_user,
        known_hosts=None,
        hpc_ssh_key=hpc_ssh_key,
    )


def get_directories() -> Directories:
    staging_dir = Path("/tmp/uploads")
    staging_dir.mkdir(parents=True, exist_ok=True)

    load_dotenv()

    hpc_remote_base = os.getenv("HPC_REMOTE_BASE")
    if not hpc_remote_base:
        raise ValueError("HPC_REMOTE_BASE environment variable is not set")

    return Directories(
        staging=staging_dir,
        hpc_remote_base=Path(hpc_remote_base),
    )
