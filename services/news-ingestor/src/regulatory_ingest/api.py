from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query

from .fetcher import DEFAULT_URL, FetchError, fetch_regulation

app = FastAPI(title="Regulatory JSON API", version="1.0.0")
CACHE_FILE = Path(__file__).resolve().parents[1] / "data/regulation.json"


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/regulations/fetch")
async def fetch_now(url: str = Query(default=DEFAULT_URL)):
    """Fetch the source now and return normalized JSON immediately."""
    try:
        result = await fetch_regulation(url)
    except FetchError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    CACHE_FILE.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return result


@app.get("/regulations/latest")
async def latest():
    """Return the last successful cron/API result without fetching upstream."""
    if not CACHE_FILE.exists():
        raise HTTPException(status_code=404, detail="No cached regulation yet")
    return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
