# Security and privacy

Purpose: threat model, auth model, secrets handling, and the OWASP level this project meets.
Read this when: you touch auth, input handling, secrets, dependencies or personal data.
Related files: docs/requirements/SRS.md, docs/RUNBOOK.md

Status: Draft

## Threats

### T-001 {{threat}}

- STRIDE category: {{spoofing | tampering | repudiation | information disclosure | denial of service | elevation of privilege}}
- Mitigation: {{mitigation}}
- Test: {{test}}

## Auth model

{{who can do what}}

## Secrets

- Secrets live in environment variables loaded from `.env` (never committed; `.env.example` lists names only).
- Claude Code is denied read access to `.env*` and key files by `.claude/settings.json`.
- CI scans every push for secrets (gitleaks).

## Standard

OWASP ASVS level {{1 | 2}}. Checklist: https://owasp.org/www-project-application-security-verification-standard/

## Dependencies

New dependencies need a reason in the pull request. Lockfiles are protected from agent edits.
