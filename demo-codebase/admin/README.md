# Regulation Crawler Admin

Mock FastAPI admin service for monitoring regulation crawler runs, reviewing discovered regulations, and simulating remediation pull requests.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open `http://127.0.0.1:8000/`.

## Test

```bash
pytest
```

The first version is intentionally deterministic: crawler domains, progress events, regulations, emails, repositories, and pull request URLs are all mocked.
