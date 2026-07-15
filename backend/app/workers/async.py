from ..core.store import store

async def run_job(job_id: str) -> dict | None:
    job = next((item for item in store.data.get("workflows", []) if item["id"] == job_id), None)
    if job: job["status"] = "running"; store.save()
    return job
