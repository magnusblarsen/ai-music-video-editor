from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, Enum as SqlEnum, Integer, Text, func, ForeignKey, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.ext.mutable import MutableList


from app.db import Base


class TaskState(str, Enum):
    started = "started"
    staging = "staging"
    ready = "ready"
    running = "running"
    videos_segmented = "videos_segmented"
    done = "done"
    failed = "failed"


class TaskRecord(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)

    state: Mapped[TaskState] = mapped_column(
        SqlEnum(TaskState, name="task_state"),
        default=TaskState.started,
        nullable=False,
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    tracks: Mapped[list["Track"]] = relationship(
        back_populates="task",
        cascade="all, delete-orphan",
    )

    job_id: Mapped[str | None] = mapped_column(Text, nullable=True)

    cut_markers: Mapped[list[float]] = mapped_column(
        MutableList.as_mutable(JSON),
        nullable=True,
        default=list,
    )


class Track(Base):
    __tablename__ = "tracks"

    id: Mapped[int] = mapped_column(primary_key=True)

    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), nullable=False)

    task: Mapped["TaskRecord"] = relationship(back_populates="tracks")

    clips: Mapped[list["Clip"]] = relationship(
        back_populates="track",
        cascade="all, delete-orphan",
        order_by="Clip.start_seconds",
    )


class Clip(Base):
    __tablename__ = "clips"

    id: Mapped[int] = mapped_column(primary_key=True)

    track_id: Mapped[int] = mapped_column(ForeignKey("tracks.id"), nullable=False)

    url: Mapped[str] = mapped_column(Text, nullable=True)

    clip_index: Mapped[int] = mapped_column(Integer, nullable=False)
    start_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    end_seconds: Mapped[float] = mapped_column(Float, nullable=False)
    duration_seconds: Mapped[float] = mapped_column(Float, nullable=False)

    script_description: Mapped[str] = mapped_column(Text, nullable=False)
    aesthetics: Mapped[str] = mapped_column(Text, nullable=False)
    camera_movement: Mapped[str] = mapped_column(Text, nullable=False)

    track: Mapped["Track"] = relationship(back_populates="clips")
