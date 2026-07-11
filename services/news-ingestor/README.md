# News Ingestor Service

Python service for fetching regulatory publications and exposing them as
normalized news article JSON for the Saola application.

The current source is the Vietnamese Government publication of Resolution
`05/2025/NQ-CP` concerning the pilot crypto-asset market:

<https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-quyet-so-5-2025-nq-cp-ve-trien-khai-thi-diem-thi-truong-tai-san-ma-hoa-tai-viet-nam-119250909184045221.htm>

## Output contract

Every response conforms to
[`shared/schemas/news-article.schema.json`](../../shared/schemas/news-article.schema.json).
No fields outside that schema are emitted.

```json
{
  "url": "https://xaydungchinhsach.chinhphu.vn/...",
  "title": "TOÀN VĂN: Nghị quyết số 05/2025/NQ-CP ...",
  "sourceDomain": "xaydungchinhsach.chinhphu.vn",
  "publishedAt": "2025-09-09T00:00:00+07:00",
  "author": "Chính phủ Việt Nam",
  "summary": "...",
  "bodyText": "...",
  "fetchedAt": "2026-07-11T06:54:44.936053+00:00"
}
```

For regulatory documents, `publishedAt` means the legal effective date, not the
webpage publication timestamp. The full resolution body is flattened into
`bodyText`. The parser keeps the 19 main articles and excludes appendix forms
whose internal article numbering restarts at 1.

## Local setup

Run these commands from `services/news-ingestor`:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r src/requirements.txt
```

Start the HTTP API:

```bash
uvicorn --app-dir src regulatory_ingest.api:app --reload
```

The interactive OpenAPI documentation is available at
<http://127.0.0.1:8000/docs>.

## HTTP API

### Fetch immediately

Fetch the upstream page, normalize it, update the cache, and return the new JSON
in the same request:

```bash
curl http://127.0.0.1:8000/regulations/fetch
```

An alternative trusted source can be supplied as an encoded `url` query
parameter:

```bash
curl --get http://127.0.0.1:8000/regulations/fetch \
  --data-urlencode 'url=https://example.gov/regulation.html'
```

Do not expose arbitrary URL fetching to untrusted clients without adding a
source-domain allowlist.

### Read the cached result

Return the last successful result without contacting the upstream website:

```bash
curl http://127.0.0.1:8000/regulations/latest
```

The cache is stored at `src/data/regulation.json`. A failed refresh does not
replace the last successful file.

### Health check

```bash
curl http://127.0.0.1:8000/health
```

## CLI and cron

Refresh the JSON without starting the HTTP server:

```bash
.venv/bin/python src/scripts/fetch_regulation.py \
  --output src/data/regulation.json
```

Example hourly crontab entry:

```cron
0 * * * * cd /absolute/path/to/saola-engine/services/news-ingestor && .venv/bin/python src/scripts/fetch_regulation.py --output src/data/regulation.json >> src/data/cron.log 2>&1
```

Use an absolute project path in cron. The command exits non-zero when fetching
or parsing fails, allowing the scheduler to detect unsuccessful refreshes.

## Project layout

```text
src/
├── regulatory_ingest/
│   ├── api.py             # FastAPI routes and cache handling
│   └── fetcher.py         # HTTP fetch and regulation-to-NewsArticle parser
├── scripts/
│   └── fetch_regulation.py
├── data/
│   └── regulation.json    # Last successful result
└── requirements.txt
```

## Amplify deployment

For AWS Amplify, package `regulatory_ingest/fetcher.py` in an Amplify Function.
Invoke it from an Amplify scheduled function for periodic refreshes and from a
protected custom mutation or HTTP route for immediate refreshes. Store the
complete JSON or source snapshot in S3 and publish the schema-compatible record
through Amplify Data for the application to query.

