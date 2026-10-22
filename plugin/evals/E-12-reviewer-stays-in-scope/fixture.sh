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
mkdir -p "$(dirname 'docs/requirements/SRS.md')"
cat > 'docs/requirements/SRS.md' <<'PILOT_EOF'
Purpose: requirements.
Read this when: implementing.
Related files: none

### FR-001 Slug

When a title is given, the system shall return a lowercase slug with words joined by single hyphens and no characters other than a-z, 0-9 and hyphens.

PILOT_EOF
mkdir -p "$(dirname 'src/slug.js')"
cat > 'src/slug.js' <<'PILOT_EOF'
// @req FR-001
export function slug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

PILOT_EOF
mkdir -p "$(dirname 'tests/slug.test.js')"
cat > 'tests/slug.test.js' <<'PILOT_EOF'
// @req FR-001
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug } from '../src/slug.js';
test('FR-001', () => {
  assert.equal(slug('Hello, World!'), 'hello-world');
  assert.equal(slug('  a  b '), 'a-b');
});

PILOT_EOF
git add -A && git commit -qm fixture
