from ..kernel.scheduler import scheduler

def enqueue(job_id: str, priority: int = 100) -> None: scheduler.enqueue(job_id, priority)
def dequeue() -> str | None: return scheduler.dequeue()
