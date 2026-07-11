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
    pull_request_url: HttpUrl
