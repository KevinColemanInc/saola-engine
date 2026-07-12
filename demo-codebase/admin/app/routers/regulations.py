from fastapi import APIRouter, Form

from app.models.regulation import FixResponse, PullRequestJob
from app.services.mock_github_service import github_service
from app.services.mock_regulation_service import regulation_service

router = APIRouter()


@router.post("/{regulation_id}/fix", response_model=FixResponse)
async def create_fix(regulation_id: str, repository: str = Form(...)) -> FixResponse:
    regulation = await regulation_service.get_regulation(regulation_id)
    return await github_service.create_fix_pull_request(regulation, repository)


@router.get("/fix-jobs/{job_id}", response_model=PullRequestJob)
async def get_fix_job(job_id: str) -> PullRequestJob:
    return github_service.get_job(job_id)
