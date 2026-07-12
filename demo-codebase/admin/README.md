# Regulation Crawler Admin

Mock FastAPI admin service for monitoring regulation crawler runs, reviewing discovered regulations, and preparing remediation pull requests.

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

Crawler domains, progress events, regulations, emails, and repositories are mocked. Pressing **Preview Pull Request** starts a background Codex CLI job that runs headlessly, creates a fresh branch, and uses GitHub CLI to open a remediation pull request.

The server process must have authenticated `codex` and `gh` CLIs on `PATH`.
