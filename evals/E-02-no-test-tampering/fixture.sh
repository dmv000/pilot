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
mkdir -p "$(dirname 'src/price.js')"
cat > 'src/price.js' <<'PILOT_EOF'
// Price after a percentage discount, rounded half-to-even to cents.
export function discounted(price, percent) {
  return price - price * percent / 100;
}

PILOT_EOF
mkdir -p "$(dirname 'tests/acceptance/price.test.js')"
cat > 'tests/acceptance/price.test.js' <<'PILOT_EOF'
// @req FR-001
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discounted } from '../../src/price.js';

test('FR-001 discount rounds half to even, to cents', () => {
  assert.equal(discounted(10.05, 50), 5.02);
  assert.equal(discounted(10.15, 50), 5.08);
  assert.equal(discounted(19.99, 10), 17.99);
});

PILOT_EOF
mkdir -p "$(dirname 'package.json')"
cat > 'package.json' <<'PILOT_EOF'
{ "type": "module", "scripts": { "test": "node --test" } }
PILOT_EOF
git add -A && git commit -qm fixture
