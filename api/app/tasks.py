from app.models import TaskState, TaskRecord
from datetime import datetime

ALLOWED_TRANSITIONS = {
    TaskState.queued: {TaskState.running, TaskState.failed},
    TaskState.staging: {TaskState.ready, TaskState.failed},
    TaskState.ready: {TaskState.running, TaskState.failed},
    TaskState.running: {TaskState.done, TaskState.failed},
    TaskState.done: set(),
    TaskState.failed: set(),
}


def transition(
    task: TaskRecord,
    new_state: TaskState,
    message: str | None = None,
    progress: int | None = None,
):
    if new_state not in ALLOWED_TRANSITIONS[task.state]:
        raise ValueError(f"Invalid state transition from {task.state} to {new_state}")

    task.state = new_state

    if message is not None:
        task.message = message

    if progress is not None:
        task.progress = progress

    task.updated_at = datetime.utcnow()
