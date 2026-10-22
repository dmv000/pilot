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
Purpose: state.
Read this when: every session.
Related files: docs/planning/ROADMAP.md

## Next action

/pilot:step 2

PILOT_EOF
mkdir -p "$(dirname 'docs/planning/ROADMAP.md')"
cat > 'docs/planning/ROADMAP.md' <<'PILOT_EOF'
Purpose: steps.
Read this when: starting a step.
Related files: docs/planning/PROGRESS.md

## Step 2 Export

- Stories: US-002

PILOT_EOF
git add -A && git commit -qm fixture
