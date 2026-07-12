import asyncio
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException

from app.models.regulation import FixResponse, PullRequestJob, Regulation
from app.repositories.mock_store import REPOSITORIES


class GitHubService:
    def __init__(self) -> None:
        self.jobs: dict[str, PullRequestJob] = {}

    async def create_fix_pull_request(
        self,
        regulation: Regulation,
        repository: str,
    ) -> FixResponse:
        job = self.create_fix_pull_request_job(regulation, repository)
        asyncio.create_task(self.run_fix_job(job.id))

        return FixResponse(
            status=job.status,
            repository=repository,
            job_id=job.id,
            branch_name=job.branch_name,
            message="Pull request remediation job queued.",
        )

    def create_fix_pull_request_job(
        self,
        regulation: Regulation,
        repository: str,
    ) -> PullRequestJob:
        if repository not in REPOSITORIES:
            raise HTTPException(status_code=400, detail="Unknown repository")

        job_id = f"fix_{uuid.uuid4().hex[:12]}"
        branch_name = f"codex/{regulation.id}-{job_id[-6:]}"
        workspace = Path(tempfile.mkdtemp(prefix=f"{job_id}_"))
        log_path = workspace / "codex.log"
        now = datetime.now(timezone.utc)
        job = PullRequestJob(
            id=job_id,
            status="queued",
            repository=repository,
            regulation_id=regulation.id,
            regulation_title=regulation.title,
            regulation_description=regulation.description,
            regulation_jurisdiction=regulation.jurisdiction,
            regulation_source_name=regulation.source_name,
            regulation_source_url=regulation.source_url,
            regulation_published_at=regulation.published_at,
            branch_name=branch_name,
            workspace=str(workspace),
            log_path=str(log_path),
            created_at=now,
            updated_at=now,
        )
        self.jobs[job_id] = job
        return job

    def get_job(self, job_id: str) -> PullRequestJob:
        job = self.jobs.get(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Pull request job not found")
        return job

    async def run_fix_job(self, job_id: str) -> None:
        job = self.get_job(job_id)
        self._update_job(job, status="running")

        prompt = self._build_codex_prompt(job)
        try:
            return_code = await asyncio.to_thread(self._run_codex_process, job, prompt)
        except OSError as exc:
            self._update_job(
                job,
                status="failed",
                error=f"Unable to start Codex CLI: {exc}",
            )
            return

        last_message_path = Path(job.workspace) / "codex-last-message.txt"
        last_message = last_message_path.read_text() if last_message_path.exists() else ""
        log_path = Path(job.log_path)
        log_output = log_path.read_text() if log_path.exists() else ""
        pull_request_url = self._extract_pull_request_url(f"{last_message}\n{log_output}")

        if return_code == 0 and pull_request_url:
            self._update_job(
                job,
                status="completed",
                pull_request_url=pull_request_url,
            )
            return

        if return_code == 0:
            self._update_job(
                job,
                status="failed",
                error="Codex completed without reporting a GitHub pull request URL.",
            )
            return

        self._update_job(
            job,
            status="failed",
            error=f"Codex exited with status {return_code}. See {job.log_path}.",
            pull_request_url=pull_request_url,
        )

    def _run_codex_process(self, job: PullRequestJob, prompt: str) -> int:
        workspace = Path(job.workspace)
        last_message_path = workspace / "codex-last-message.txt"
        command = [
            "codex",
            "--ask-for-approval",
            "never",
            "exec",
            "--cd",
            str(workspace),
            "--skip-git-repo-check",
            "--ignore-user-config",
            "--sandbox",
            "danger-full-access",
            "--dangerously-bypass-approvals-and-sandbox",
            "--output-last-message",
            str(last_message_path),
            "-",
        ]
        env = os.environ.copy()
        env.update(
            {
                "CODEX_REMEDIATION_JOB_ID": job.id,
                "CODEX_REMEDIATION_REPOSITORY": job.repository,
                "CODEX_REMEDIATION_BRANCH": job.branch_name,
            }
        )

        with Path(job.log_path).open("a", encoding="utf-8") as log_file:
            log_file.write(f"Starting remediation job {job.id}\n")
            log_file.write(f"Repository: {job.repository}\n")
            log_file.write(f"Branch: {job.branch_name}\n\n")
            process = subprocess.Popen(
                command,
                cwd=workspace,
                env=env,
                stdin=subprocess.PIPE,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                text=True,
            )
            self._update_job(job, pid=process.pid)
            process.communicate(prompt)
            return process.returncode

    def _build_codex_prompt(self, job: PullRequestJob) -> str:
        return f"""You are running as a headless remediation agent.

Goal:
Modify `{job.repository}` so it complies with the newly detected regulation.

Regulation details:
- Title: {job.regulation_title}
- Description: {job.regulation_description}
- Jurisdiction: {job.regulation_jurisdiction}
- Source: {job.regulation_source_name} ({job.regulation_source_url})
- Published at: {job.regulation_published_at.isoformat()}

Compliance interpretation:
- Vietnamese-nationality users must not be allowed to trade locally minted Vietnamese coins such as AXS.
- Foreign-nationality users may trade those Vietnamese coins, including foreign users residing in Vietnam.
- Use user nationality for this rule; do not block solely because the user location is Vietnam.
- Effective date from the regulation text is January 1, 2027.

Requirements:
1. Use GitHub CLI (`gh`) to clone `{job.repository}` into this workspace if it is not already present.
2. Create a fresh branch named `{job.branch_name}` from the repository default branch.
3. Inspect the code and implement the minimum compliance change required by the regulation.
4. Run the most relevant tests or checks available in the repository.
5. Commit the change with a clear compliance-focused message.
6. Push `{job.branch_name}` to origin.
7. Open a GitHub pull request with `gh pr create` for `{job.repository}`.
8. The pull request body must include a section titled `Regulatory justification` explaining why the change is required for the new regulation, plus a short test summary.
9. Print the pull request URL in your final response.

Run fully headlessly. Do not ask for human permission or clarification.
"""

    def _extract_pull_request_url(self, output: str) -> str | None:
        match = re.search(r"https://github\.com/[^\s)]+/pull/\d+", output)
        return match.group(0) if match else None

    def _update_job(self, job: PullRequestJob, **changes: object) -> None:
        for key, value in changes.items():
            setattr(job, key, value)
        job.updated_at = datetime.now(timezone.utc)


github_service = GitHubService()
