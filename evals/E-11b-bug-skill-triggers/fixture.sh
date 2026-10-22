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
git add -A && git commit -qm fixture
