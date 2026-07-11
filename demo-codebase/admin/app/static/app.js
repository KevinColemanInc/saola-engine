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
