from pydantic import BaseModel, ConfigDict


class ClipRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    clip_index: int
    start_seconds: float
    end_seconds: float
    duration_seconds: float
    script_description: str
    aesthetics: str
    camera_movement: str


class TrackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_id: int
    clips: list[ClipRead]
