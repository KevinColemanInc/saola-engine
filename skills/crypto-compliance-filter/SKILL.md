# Crypto Compliance Filter

Use this skill to filter fetched news articles for country-specific crypto compliance changes.

## Inputs

- `articles`: Article records matching `shared/schemas/news-article.schema.json`.
- `countries`: Optional list of countries to prioritize.
- `topics`: Optional topic hints such as KYC, AML, sanctions, licensing, reporting, stablecoins, custody, travel rule, taxation, or consumer protection.

## Output

Emit findings matching `shared/schemas/compliance-finding.schema.json`.

## Method

1. Remove non-regulatory, market-only, opinion-only, and duplicate articles.
2. Identify the country or jurisdiction affected.
3. Classify the compliance topic.
4. Extract the effective date, regulator, required action, and confidence.
5. Preserve evidence URLs and short source excerpts.
6. Mark uncertain findings for human review instead of treating them as actionable.
