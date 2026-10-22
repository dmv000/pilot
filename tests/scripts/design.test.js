// T-design: design templates, design-check (tokens, WCAG contrast, sections, hard-coded colors), preview.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPilot, write, read } from '../helpers.js';
import { contrast, parseColor } from '../../plugin/scripts/lib/design.js';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-design-'));
function scaffolded() {
  const dir = tmp();
  const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
  fs.writeFileSync(answers, JSON.stringify({ project_name: 'Habits', projectType: 'web-app', stack: 'web-ts', profile: 'pro', hasAI: false, design: 'pending' }));
  assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers]).code, 0);
  return dir;
}

test('WCAG contrast math matches known values', () => {
  assert.equal(contrast(parseColor('#000'), parseColor('#fff')).toFixed(2), '21.00');
  assert.equal(contrast(parseColor('#777777'), parseColor('#ffffff')).toFixed(2), '4.48');
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), [10, 20, 30]);
  assert.equal(parseColor('blue'), null);
});

test('design-init copies both templates, records them, and the starter set passes design-check', () => {
  const dir = scaffolded();
  const r = runPilot(['design-init', '--project', dir]);
  assert.equal(r.code, 0, r.stderr);
  assert.match(read(dir, 'docs/design/DESIGN.md'), /^# Habits — Design system/m);
  const manifest = JSON.parse(read(dir, '.pilot/manifest.json'));
  assert.match(manifest.files['docs/design/tokens.json'].sha256, /^[0-9a-f]{64}$/);
  assert.notEqual(manifest.files['docs/design/tokens.json'].sha256, '0'.repeat(64));
  const check = runPilot(['design-check', '--project', dir]);
  assert.equal(check.code, 0, check.stdout);
  // A second run never overwrites.
  write(dir, 'docs/design/DESIGN.md', '# Mine\n');
  runPilot(['design-init', '--project', dir]);
  assert.equal(read(dir, 'docs/design/DESIGN.md'), '# Mine\n');
});

test('design-check fails a contrast pair below its minimum, a bad color, and a missing section', () => {
  const dir = scaffolded();
  runPilot(['design-init', '--project', dir]);
  const tokens = JSON.parse(read(dir, 'docs/design/tokens.json'));
  tokens.color['text-muted'].$value = '#aaaaaa';
  tokens.color.danger.$value = 'reddish';
  write(dir, 'docs/design/tokens.json', JSON.stringify(tokens));
  write(dir, 'docs/design/DESIGN.md', read(dir, 'docs/design/DESIGN.md').replace('## Accessibility', '## Access'));
  const r = runPilot(['design-check', '--project', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /contrast color\.text-muted on color\.bg is 2\.32:1; it must be at least 4\.5:1/);
  assert.match(r.stdout, /color\.danger is a color but "reddish"/);
  assert.match(r.stdout, /missing the section "## Accessibility/);
});

test('design-check warns about hard-coded colors but not issue references', () => {
  const dir = scaffolded();
  runPilot(['design-init', '--project', dir]);
  write(dir, 'src/Button.tsx', 'export const B = () => <button style={{ color: "#ff0000" }}>Go</button>; // TODO style (#12)\n');
  const r = runPilot(['design-check', '--project', dir]);
  assert.equal(r.code, 0);
  assert.match(r.stdout, /hard-coded colors.*src\/Button\.tsx \(#ff0000\)/);
  assert.doesNotMatch(r.stdout, /#12\b/);
});

test('project check (pilot-check) includes design errors once a design system exists', () => {
  const dir = scaffolded();
  runPilot(['trace', '--project', dir, '--write']);
  assert.equal(runPilot(['check', '--project', dir]).code, 0);
  runPilot(['design-init', '--project', dir]);
  const tokens = JSON.parse(read(dir, 'docs/design/tokens.json'));
  tokens.color['on-primary'].$value = '#3355ff';
  write(dir, 'docs/design/tokens.json', JSON.stringify(tokens));
  const r = runPilot(['check', '--project', dir]);
  assert.equal(r.code, 1);
  assert.match(r.stdout, /\[design\] contrast color\.on-primary on color\.primary/);
});

test('preview shows the contrast table and is deterministic', () => {
  const dir = scaffolded();
  runPilot(['design-init', '--project', dir]);
  runPilot(['preview', '--project', dir]);
  const a = read(dir, 'docs/design/preview.html');
  runPilot(['preview', '--project', dir]);
  assert.equal(read(dir, 'docs/design/preview.html'), a);
  assert.match(a, /<h2>Contrast<\/h2>/);
  assert.match(a, /color\.on-primary<\/code> on <code>color\.primary/);
  assert.doesNotMatch(a, /\$pilot/);
});
