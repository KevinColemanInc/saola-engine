from fastapi import HTTPException

from app.models.regulation import FixResponse, Regulation
from app.repositories.mock_store import REPOSITORIES


class GitHubService:
    async def create_fix_pull_request(
        self,
        regulation: Regulation,
        repository: str,
    ) -> FixResponse:
        if repository not in REPOSITORIES:
            raise HTTPException(status_code=400, detail="Unknown repository")

        return FixResponse(
            status="completed",
            repository=repository,
            pull_request_url=f"https://github.com/{repository}/pull/42",
        )


github_service = GitHubService()
