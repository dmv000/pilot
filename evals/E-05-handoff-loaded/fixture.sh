#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$(dirname '.pilot/manifest.json')"
cat > '.pilot/manifest.json' <<'PILOT_EOF'
{
  "schemaVersion": 1,
  "kitVersion": "0.1.0",
  "templateVersion": "v1",
  "profile": "pro",
  "projectType": "web-app",
  "stack": "generic",
  "hasAI": false,
  "design": "not-applicable",
  "checks": {
    "fast": "node --test",
    "full": "node --test",
    "acceptance": "node --test tests/acceptance/"
  },
  "protectedPaths": [],
  "files": {}
}
PILOT_EOF
git init -q && git config user.email eval@example.com && git config user.name eval
mkdir -p "$(dirname 'docs/planning/HANDOFF.md')"
cat > 'docs/planning/HANDOFF.md' <<'PILOT_EOF'
Purpose: state for the next session.
Read this when: every session.
Related files: docs/planning/ROADMAP.md

## Current step

Step 3 (export) in progress.

## Next action

Run the migration dry-run for the invoices table, then /pilot:step 3.

PILOT_EOF
git add -A && git commit -qm fixture
