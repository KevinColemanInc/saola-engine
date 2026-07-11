from fastapi.testclient import TestClient

from app.main import app


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


def test_fix_workflow_creates_mock_pull_request():
    response = client.post(
        "/api/regulations/reg_vn_reporting_001/fix",
        data={"repository": "company/crypto-wallet"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "completed",
        "repository": "company/crypto-wallet",
        "pull_request_url": "https://github.com/company/crypto-wallet/pull/42",
    }
