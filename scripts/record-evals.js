#!/usr/bin/env node
// After `claude plugin eval`, append a summary of the newest result to docs/audits/eval-history.jsonl.
// /pilot:audit and the release rule read that history. Usage: node scripts/record-evals.js [path/to/aggregate-result.json]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = path.join(REPO, 'plugin', 'evals', 'results');
let file = process.argv[2];
if (!file) {
  const runs = fs.existsSync(resultsDir) ? fs.readdirSync(resultsDir).filter(d => fs.existsSync(path.join(resultsDir, d, 'aggregate-result.json'))).sort() : [];
  if (!runs.length) { console.error('No eval results found. Run npm run eval first.'); process.exit(1); }
  file = path.join(resultsDir, runs.at(-1), 'aggregate-result.json');
}
const r = JSON.parse(fs.readFileSync(file, 'utf8'));
if (r.partial) { console.error(`The eval run is partial (${r.partialReason}); not recording it.`); process.exit(1); }
const record = {
  at: new Date().toISOString(),
  claudeVersion: r.claudeVersion ?? 'unknown',
  overallScore: r.aggregates?.overallScore ?? null,
  meanDelta: r.aggregates?.meanDelta ?? null,
  costUsd: r.costUsd ?? null,
  cases: (r.cases ?? []).map(c => ({ name: c.name, score: c.aggregates?.score ?? 0, delta: c.aggregates?.delta ?? null }))
};
const out = path.join(REPO, 'docs', 'audits', 'eval-history.jsonl');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.appendFileSync(out, JSON.stringify(record) + '\n');
console.log(`recorded ${record.cases.length} cases (overall ${record.overallScore}) to docs/audits/eval-history.jsonl`);
