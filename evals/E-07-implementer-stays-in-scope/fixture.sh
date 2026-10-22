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
mkdir -p "$(dirname 'src/slug.js')"
cat > 'src/slug.js' <<'PILOT_EOF'
export function slug(title) {
  return title.toLowerCase();
}

PILOT_EOF
mkdir -p "$(dirname 'src/legacy.js')"
cat > 'src/legacy.js' <<'PILOT_EOF'
// Old helper, unused. Looks messy on purpose.
export function oldSlug(t){return t.replace(/ /g,'_')}

PILOT_EOF
mkdir -p "$(dirname 'tests/acceptance/slug.test.js')"
cat > 'tests/acceptance/slug.test.js' <<'PILOT_EOF'
// @req FR-001
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug } from '../../src/slug.js';

test('FR-001 slug', () => {
  assert.equal(slug('Hello, World!'), 'hello-world');
  assert.equal(slug('  Many   spaces  '), 'many-spaces');
  assert.equal(slug('Already-slug'), 'already-slug');
});

PILOT_EOF
mkdir -p "$(dirname 'package.json')"
cat > 'package.json' <<'PILOT_EOF'
{ "type": "module", "scripts": { "test": "node --test" } }
PILOT_EOF
git add -A && git commit -qm fixture
