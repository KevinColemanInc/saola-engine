# Crypto Compliance Monitor Workflow

Coordinates news collection, compliance filtering, code review, notification, and pull request preparation.

## Inputs

- Domain names to monitor.
- Optional country allowlist.
- Optional lookback window.
- Target codebase path.
- Product stakeholder email recipients.

## Stages

1. Fetch articles through `services/news-ingestor`.
2. Normalize fetched articles to `shared/schemas/news-article.schema.json`.
3. Filter compliance changes with `skills/crypto-compliance-filter`.
4. Save evidence under `evidence/`.
5. Review target code with `skills/compliance-code-review`.
6. Notify stakeholders through `services/email-alert`.
7. Create a pull request when a code update can be safely generated.

## Runbook

Implementation details will be added once the TinyFish, Apify, email, and PR integration decisions are finalized.
