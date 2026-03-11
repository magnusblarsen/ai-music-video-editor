from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models import TaskState


class TaskRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    state: TaskState
    progress: int
    message: str | None = None
    error: str | None = None
    created_at: datetime
    updated_at: datetime
