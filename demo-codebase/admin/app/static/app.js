const progressPanel = document.querySelector("[data-run-progress]");

if (progressPanel) {
  const runId = progressPanel.dataset.runId;
  const resultsUrl = progressPanel.dataset.resultsUrl;
  const output = progressPanel.querySelector("[data-log-output]");
  const fill = progressPanel.querySelector("[data-progress-fill]");
  const startedAt = Date.now();

  fetch(`/api/runs/${runId}/events`)
    .then((response) => response.json())
    .then((payload) => {
      const events = payload.events || [];
      const finalDelay = Math.max(...events.map((event) => event.delay_seconds), 1);
      output.textContent = "";

      events.forEach((event) => {
        window.setTimeout(() => {
          const timestamp = String(event.delay_seconds).padStart(2, "0");
          output.textContent += `[00:${timestamp}] ${event.message}\n`;
          output.scrollTop = output.scrollHeight;
        }, event.delay_seconds * 1000);
      });

      const interval = window.setInterval(() => {
        const elapsedSeconds = (Date.now() - startedAt) / 1000;
        const percent = Math.min((elapsedSeconds / finalDelay) * 100, 100);
        fill.style.width = `${percent}%`;
      }, 250);

      window.setTimeout(() => {
        window.clearInterval(interval);
        fill.style.width = "100%";
        window.location.href = resultsUrl;
      }, (finalDelay + 1) * 1000);
    })
    .catch(() => {
      output.textContent += "\nUnable to load mocked crawler events.";
    });
}

const pullRequestJob = document.querySelector("[data-pr-job]");

if (pullRequestJob) {
  const jobId = pullRequestJob.dataset.jobId;
  const status = pullRequestJob.querySelector("[data-job-status]");
  const message = pullRequestJob.querySelector("[data-job-message]");
  const link = pullRequestJob.querySelector("[data-pr-link]");

  const renderJob = (job) => {
    status.textContent = job.status;

    if (job.status === "completed") {
      message.textContent = "The pull request job completed.";
      if (job.pull_request_url) {
        link.href = job.pull_request_url;
        link.classList.remove("hidden");
      }
      return true;
    }

    if (job.status === "failed") {
      message.textContent = job.error || "The pull request job failed.";
      return true;
    }

    message.textContent = "Codex is running headlessly and will open the pull request with GitHub CLI.";
    return false;
  };

  const poll = () => {
    fetch(`/api/regulations/fix-jobs/${jobId}`)
      .then((response) => response.json())
      .then((job) => {
        if (!renderJob(job)) {
          window.setTimeout(poll, 3000);
        }
      })
      .catch(() => {
        message.textContent = "Unable to load pull request job status.";
      });
  };

  poll();
}
