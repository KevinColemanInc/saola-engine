from datetime import datetime, timedelta, timezone

from fastapi import HTTPException

from app.models.run import CrawlEvent, CrawlRun, RunStatus
from app.repositories import mock_store


class CrawlerService:
    async def start_run(self) -> CrawlRun:
        started_at = datetime.now(timezone.utc).replace(microsecond=0)
        completed_at = started_at + timedelta(seconds=50)
        run = CrawlRun(
            id=mock_store.next_run_id(),
            status=RunStatus.running,
            started_at=started_at,
            completed_at=completed_at,
            article_count=100,
            regulations=mock_store.REGULATIONS,
        )
        mock_store.RUNS.insert(0, run)
        return run

    async def list_runs(self) -> list[CrawlRun]:
        return mock_store.RUNS

    async def get_run(self, run_id: str) -> CrawlRun:
        for run in mock_store.RUNS:
            if run.id == run_id:
                return run
        raise HTTPException(status_code=404, detail="Run not found")

    async def get_events(self, run_id: str) -> list[CrawlEvent]:
        await self.get_run(run_id)
        return [
            CrawlEvent(delay_seconds=0, message="Waiting for Apify..."),
            CrawlEvent(delay_seconds=2, message="Crawling sbv.gov.vn"),
            CrawlEvent(delay_seconds=3, message="Crawling chinhphu.vn"),
            CrawlEvent(delay_seconds=3, message="Crawling mof.gov.vn"),
            CrawlEvent(delay_seconds=3, message="Crawling thuvienphapluat.vn"),
            CrawlEvent(delay_seconds=3, message="Found 100 new articles"),
            CrawlEvent(delay_seconds=2, message="Filtering articles for compliance changes"),
            CrawlEvent(delay_seconds=2, message="Consolidating duplicate articles"),
            CrawlEvent(delay_seconds=1, message="Found new regulations"),
            CrawlEvent(
                delay_seconds=1,
                message=(
                    "Emailing Vietnamese Crypto Regulation to "
                    "vietnam-legal@companyname.com"
                ),
            ),
            CrawlEvent(delay_seconds=5, message="Regulation crawl completed"),
        ]

    async def get_results(self, run_id: str):
        run = await self.get_run(run_id)
        return run.regulations


crawler_service = CrawlerService()
