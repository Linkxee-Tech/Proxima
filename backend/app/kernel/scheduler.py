from heapq import heappush, heappop


class Scheduler:
    def __init__(self) -> None: self._jobs: list[tuple[int, str]] = []
    def enqueue(self, job_id: str, priority: int = 100) -> None: heappush(self._jobs, (priority, job_id))
    def dequeue(self) -> str | None: return heappop(self._jobs)[1] if self._jobs else None

scheduler = Scheduler()
