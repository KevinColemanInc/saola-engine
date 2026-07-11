# Compliance Code Review

Use this skill to inspect a target codebase for gaps created by crypto compliance findings.

## Inputs

- `findings`: Records matching `shared/schemas/compliance-finding.schema.json`.
- `codebase_path`: Path to the product or demo codebase.
- `risk_scope`: Optional list of modules to prioritize.

## Output

- Code risk report.
- Suggested implementation changes.
- Test recommendations.
- Pull request evidence summary when changes are made.

## Method

1. Map each finding to affected product behavior.
2. Search the codebase for transaction handling, user verification, country restrictions, reporting, logging, custody, sanctions, and risk controls.
3. Identify missing or stale controls.
4. Make narrowly scoped code changes when the remediation is clear.
5. Add or update tests that prove the compliance behavior.
6. Prepare pull request notes with source evidence and risk rationale.
