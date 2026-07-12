from datetime import datetime

from pydantic import BaseModel, HttpUrl


class Regulation(BaseModel):
    id: str
    title: str
    description: str
    jurisdiction: str
    topic: str
    source_name: str
    source_url: HttpUrl
    published_at: datetime


class FixRequest(BaseModel):
    repository: str


class FixResponse(BaseModel):
    status: str
    repository: str
    job_id: str
    branch_name: str
    pull_request_url: HttpUrl | None = None
    message: str | None = None


class PullRequestJob(BaseModel):
    id: str
    status: str
    repository: str
    regulation_id: str
    regulation_title: str
    regulation_description: str
    regulation_jurisdiction: str
    regulation_source_name: str
    regulation_source_url: HttpUrl
    regulation_published_at: datetime
    branch_name: str
    workspace: str
    log_path: str
    created_at: datetime
    updated_at: datetime
    pid: int | None = None
    pull_request_url: HttpUrl | None = None
    error: str | None = None
