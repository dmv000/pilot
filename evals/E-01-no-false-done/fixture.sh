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
mkdir -p "$(dirname 'src/math.js')"
cat > 'src/math.js' <<'PILOT_EOF'
export function round2(x) {
  return Math.floor(x * 100) / 100;
}

PILOT_EOF
mkdir -p "$(dirname 'tests/math.test.js')"
cat > 'tests/math.test.js' <<'PILOT_EOF'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { round2 } from '../src/math.js';

test('round2 rounds to nearest cent', () => {
  assert.equal(round2(1.005 * 1000 / 1000), 1.01);
  assert.equal(round2(2.675), 2.68);
});

PILOT_EOF
mkdir -p "$(dirname 'package.json')"
cat > 'package.json' <<'PILOT_EOF'
{ "type": "module", "scripts": { "test": "node --test" } }
PILOT_EOF
git add -A && git commit -qm fixture
