// Dates written into project files are the owner's local date, not the UTC date.
// UTC+14 and UTC-11 cannot both share the UTC date at any moment, so one of them always catches a UTC date.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tmpProject, runHook, runPilot, read } from '../helpers.js';

const ZONES = ['Pacific/Kiritimati', 'Pacific/Pago_Pago'];
const localDate = tz => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

for (const tz of ZONES) {
  test(`scaffold writes the local date into HANDOFF.md (${tz})`, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-date-'));
    const answers = path.join(os.tmpdir(), `answers-${path.basename(dir)}.json`);
    fs.writeFileSync(answers, JSON.stringify({ project_name: 'Dates', projectType: 'script', stack: 'generic', profile: 'pro', hasAI: false, design: 'not-applicable', checks: { fast: 'node -e "process.exit(0)"' } }));
    assert.equal(runPilot(['scaffold', '--project', dir, '--answers', answers], { env: { ...process.env, TZ: tz } }).code, 0);
    assert.match(read(dir, 'docs/planning/HANDOFF.md'), new RegExp(`created with /pilot:new on ${localDate(tz)}\\.`));
  });

  test(`ask-guard logs the local date (${tz})`, () => {
    const dir = tmpProject();
    runHook('ask-guard.js', dir, {
      hook_event_name: 'PostToolUse', tool_name: 'AskUserQuestion',
      tool_input: { questions: [{ question: 'Which database?' }] },
      tool_response: 'No response after 60s — continued without an answer'
    }, { TZ: tz });
    assert.match(read(dir, 'docs/planning/ASSUMPTIONS.md'), new RegExp(`Logged: ${localDate(tz)} by`));
  });
}
