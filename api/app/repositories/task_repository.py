from sqlalchemy.orm import Session

from app.models import TaskRecord, TaskState


class TaskRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self) -> TaskRecord:
        task = TaskRecord()
        self.db.add(task)
        self.db.flush()
        return task

    def get(self, id: int) -> TaskRecord | None:
        return self.db.get(TaskRecord, id)

    def require(self, id: int) -> TaskRecord:
        task = self.get(id)
        if not task:
            raise KeyError(id)
        return task

    def update_state(
        self,
        id: int,
        *,
        state: TaskState | None = None,
        progress: int | None = None,
        message: str | None = None,
        error: str | None = None,
    ) -> TaskRecord:
        task = self.require(id)

        if state is not None:
            task.state = state
        if progress is not None:
            task.progress = progress
        if message is not None:
            task.message = message
        if error is not None:
            task.error = error

        return task
