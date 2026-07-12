from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from app.config import BASE_DIR
from app.repositories.mock_store import DOMAINS, REPOSITORIES, TOPIC_ROUTING
from app.services.mock_crawler import crawler_service
from app.services.mock_github_service import github_service
from app.services.mock_regulation_service import regulation_service

router = APIRouter()
templates = Jinja2Templates(directory=BASE_DIR / "templates")


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    runs = await crawler_service.list_runs()
    latest_run = runs[0] if runs else None
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "latest_run": latest_run,
            "runs": runs,
        },
    )


@router.get("/runs/new", response_class=HTMLResponse)
async def new_run(request: Request):
    return templates.TemplateResponse(
        request,
        "new_run.html",
        {
            "domains": DOMAINS,
            "topic_routing": TOPIC_ROUTING,
        },
    )


@router.post("/runs", response_class=HTMLResponse)
async def start_run():
    run = await crawler_service.start_run()
    return RedirectResponse(f"/runs/{run.id}/progress", status_code=303)


@router.get("/runs/{run_id}/progress", response_class=HTMLResponse)
async def run_progress(request: Request, run_id: str):
    run = await crawler_service.get_run(run_id)
    return templates.TemplateResponse(
        request,
        "run_progress.html",
        {
            "run": run,
        },
    )


@router.get("/runs/{run_id}", response_class=HTMLResponse)
async def run_results(request: Request, run_id: str):
    run = await crawler_service.get_run(run_id)
    regulations = await crawler_service.get_results(run_id)
    return templates.TemplateResponse(
        request,
        "run_results.html",
        {
            "run": run,
            "regulations": regulations,
        },
    )


@router.get("/regulations/{regulation_id}/fix", response_class=HTMLResponse)
async def fix_regulation(request: Request, regulation_id: str):
    regulation = await regulation_service.get_regulation(regulation_id)
    return templates.TemplateResponse(
        request,
        "fix_regulation.html",
        {
            "regulation": regulation,
            "repositories": REPOSITORIES,
        },
    )


@router.post("/regulations/{regulation_id}/fix", response_class=HTMLResponse)
async def submit_fix(
    request: Request,
    regulation_id: str,
    repository: str = Form(...),
):
    regulation = await regulation_service.get_regulation(regulation_id)
    return templates.TemplateResponse(
        request,
        "pull_request.html",
        {
            "regulation": regulation,
            "repository": repository,
        },
    )


@router.post("/regulations/{regulation_id}/fix/jobs")
async def start_fix_job(
    regulation_id: str,
    repository: str = Form(...),
):
    regulation = await regulation_service.get_regulation(regulation_id)
    result = await github_service.create_fix_pull_request(regulation, repository)
    return RedirectResponse(
        f"/pull-request-jobs/{result.job_id}",
        status_code=303,
    )


@router.get("/pull-request-jobs/{job_id}", response_class=HTMLResponse)
async def view_fix_job(request: Request, job_id: str):
    job = github_service.get_job(job_id)
    return templates.TemplateResponse(
        request,
        "pull_request_job.html",
        {
            "job": job,
        },
    )
