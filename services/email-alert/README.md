# Email Alert Service

MCP or CLI service that sends product risk notifications when crypto compliance changes may affect the codebase.

## Planned Responsibilities

- Accept normalized compliance findings.
- Accept code review risks and recommended remediation.
- Render a concise stakeholder email.
- Send through the selected company email integration.
- Record send status for auditability.

## Interface Placeholder

```bash
email-alert --findings findings.json --recipients product@example.com --dry-run
```
