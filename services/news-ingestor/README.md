# News Ingestor Service

MCP or CLI service that accepts a list of domain names and outputs news articles related to crypto compliance.

## Planned Responsibilities

- Fetch articles from specified domains through TinyFish and Apify.
- Deduplicate URLs.
- Extract article metadata and body text.
- Emit records matching `shared/schemas/news-article.schema.json`.
- Persist raw or summarized source evidence under `evidence/article-snapshots/`.

## Interface Placeholder

```bash
news-ingestor --domains example.com,regulator.gov --lookback-days 7 --output articles.json
```
