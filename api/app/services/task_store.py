from app.models import TaskRecord


# TODO: Should be real db
class InMemoryTaskStore:
    def __init__(self) -> None:
        self._tasks: dict[str, TaskRecord] = {}

    def create(self, task_id: str) -> TaskRecord:
        task = TaskRecord(task_id=task_id)
        self._tasks[task_id] = task
        return task

    def get(self, task_id: str) -> TaskRecord | None:
        return self._tasks.get(task_id)

    def require(self, task_id: str) -> TaskRecord:
        task = self.get(task_id)
        if not task:
            raise KeyError(task_id)
        return task


task_store = InMemoryTaskStore()
