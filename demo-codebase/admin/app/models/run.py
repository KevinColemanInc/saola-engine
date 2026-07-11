from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from app.models.regulation import Regulation


class RunStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class CrawlEvent(BaseModel):
    delay_seconds: int
    message: str


class CrawlRun(BaseModel):
    id: str
    status: RunStatus
    started_at: datetime
    completed_at: datetime | None = None
    article_count: int = 0
    regulations: list[Regulation] = Field(default_factory=list)
