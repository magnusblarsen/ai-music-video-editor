from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class TaskState(str, Enum):
    queued = "queued"
    staging = "staging"  # Uploading files
    ready = "ready"  # Waiting to be started
    running = "running"  # Sbtach running
    done = "done"
    failed = "failed"


class TaskRecord(BaseModel):
    task_id: str
    state: TaskState = TaskState.queued
    progress: int = 0
    message: Optional[str] = None
    error: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
