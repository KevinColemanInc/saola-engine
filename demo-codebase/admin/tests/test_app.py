from fastapi.testclient import TestClient

from app.main import app
from app.repositories.mock_store import REGULATIONS
from app.services.mock_github_service import github_service


client = TestClient(app)


def test_dashboard_loads():
    response = client.get("/")

    assert response.status_code == 200
    assert "Runs Dashboard" in response.text
    assert "Start New Run" in response.text


def test_create_run_and_get_events():
    create_response = client.post("/api/runs")

    assert create_response.status_code == 200
    run_id = create_response.json()["id"]

    events_response = client.get(f"/api/runs/{run_id}/events")

    assert events_response.status_code == 200
    payload = events_response.json()
    assert payload["run_id"] == run_id
    assert payload["events"][-1]["message"] == "Regulation crawl completed"


def test_fix_workflow_starts_pull_request_job(monkeypatch):
    async def skip_codex_job(job_id: str) -> None:
        job = github_service.get_job(job_id)
        job.status = "completed"
        job.pull_request_url = "https://github.com/KevinColemanInc/saola-engine/pull/42"

    monkeypatch.setattr(github_service, "run_fix_job", skip_codex_job)

    response = client.post(
        "/api/regulations/reg_vn_reporting_001/fix",
        data={"repository": "KevinColemanInc/saola-engine"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued"
    assert payload["repository"] == "KevinColemanInc/saola-engine"
    assert payload["job_id"].startswith("fix_")
    assert payload["branch_name"].startswith("codex/reg_vn_reporting_001-")
    assert payload["pull_request_url"] is None


def test_preview_pull_request_button_starts_job(monkeypatch):
    async def skip_codex_job(job_id: str) -> None:
        job = github_service.get_job(job_id)
        job.status = "completed"
        job.pull_request_url = "https://github.com/KevinColemanInc/saola-engine/pull/42"

    monkeypatch.setattr(github_service, "run_fix_job", skip_codex_job)

    response = client.post(
        "/regulations/reg_vn_reporting_001/fix/jobs",
        data={"repository": "KevinColemanInc/saola-engine"},
        follow_redirects=False,
    )

    assert response.status_code == 303
    assert response.headers["location"].startswith("/pull-request-jobs/fix_")


def test_codex_command_places_global_approval_flag_before_exec(monkeypatch):
    captured = {}

    class FakeProcess:
        pid = 1234
        returncode = 0

        def communicate(self, prompt: str) -> None:
            captured["prompt"] = prompt

    def fake_popen(command, **kwargs):
        captured["command"] = command
        return FakeProcess()

    monkeypatch.setattr("app.services.mock_github_service.subprocess.Popen", fake_popen)

    job = github_service.create_fix_pull_request_job(
        regulation=REGULATIONS[0],
        repository="KevinColemanInc/saola-engine",
    )

    github_service._run_codex_process(job, "prompt")

    command = captured["command"]
    assert command[:4] == ["codex", "--ask-for-approval", "never", "exec"]
    assert "--ask-for-approval" not in command[4:]
    assert "--ignore-user-config" in command


def test_codex_prompt_includes_full_regulation_context():
    job = github_service.create_fix_pull_request_job(
        regulation=REGULATIONS[0],
        repository="KevinColemanInc/saola-engine",
    )

    prompt = github_service._build_codex_prompt(job)

    assert "Vietnamese-nationality users must not be allowed" in prompt
    assert "Foreign-nationality users may trade" in prompt
    assert "Use user nationality for this rule" in prompt
    assert "January 1, 2027" in prompt
