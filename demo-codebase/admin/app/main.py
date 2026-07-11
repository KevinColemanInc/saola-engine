from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.config import BASE_DIR
from app.routers import pages, regulations, runs

app = FastAPI(title="Regulation Crawl Check")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")

app.include_router(pages.router)
app.include_router(runs.router, prefix="/api/runs", tags=["runs"])
app.include_router(regulations.router, prefix="/api/regulations", tags=["regulations"])
