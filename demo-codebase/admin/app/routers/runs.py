from fastapi import APIRouter

from app.models.run import CrawlRun
from app.services.mock_crawler import crawler_service

router = APIRouter()


@router.post("", response_model=CrawlRun)
async def create_run() -> CrawlRun:
    return await crawler_service.start_run()


@router.get("/{run_id}/events")
async def get_run_events(run_id: str):
    run = await crawler_service.get_run(run_id)
    events = await crawler_service.get_events(run_id)
    return {
        "run_id": run.id,
        "status": run.status,
        "events": events,
    }
