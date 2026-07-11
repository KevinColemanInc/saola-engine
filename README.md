# Saola Engine

Agent workflow scaffold for monitoring crypto compliance news, checking product code for required changes, notifying stakeholders, and preparing pull requests with evidence.

## Repository Layout

```text
workflows/
  crypto-compliance-monitor/      End-to-end workflow definition and runbooks.
services/
  news-ingestor/                  MCP or CLI service for TinyFish/Apify article collection.
  email-alert/                    MCP or CLI service for outbound risk emails.
skills/
  crypto-compliance-filter/       Skill for filtering articles to crypto compliance changes.
  compliance-code-review/         Skill for checking a codebase against compliance changes.
demo-codebase/
  crypto-transactions/            Demo app used by the review skill to propose changes.
shared/
  schemas/                        Shared JSON schemas and typed contracts.
  fixtures/                       Sample inputs and outputs for demos/tests.
evidence/
  article-snapshots/              Stored source material for PR/email evidence.
  compliance-findings/            Normalized findings emitted by the workflow.
```

## Planned Flow

1. `services/news-ingestor` accepts domain names and returns relevant news articles.
2. `skills/crypto-compliance-filter` filters articles for country-specific crypto compliance changes.
3. `skills/compliance-code-review` uses those findings to inspect `demo-codebase/crypto-transactions`.
4. `services/email-alert` sends risk notifications to product stakeholders.
5. The workflow creates a pull request when a code change is possible and attaches supporting evidence.
