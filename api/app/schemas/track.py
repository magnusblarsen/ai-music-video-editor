from pydantic import BaseModel, ConfigDict


class ClipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    start_offset_ms: int


class TrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    clips: list[ClipRead]
