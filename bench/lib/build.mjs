// Builds the starting workspace for one task and one arm. Both arms get the same requirement text:
// vanilla as one SPEC.md, pilot as pilot's PRD/SRS/TECH-SPEC/ROADMAP generated from the same task.json.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const BENCH = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const KIT = path.resolve(BENCH, '..');
export const PLUGIN = path.join(KIT, 'plugin');
const TASKS = path.join(BENCH, 'tasks');

export const loadTask = id => JSON.parse(fs.readFileSync(path.join(TASKS, id, 'task.json'), 'utf8'));

const copyDir = (src, dst) => { if (fs.existsSync(src)) fs.cpSync(src, dst, { recursive: true }); };
const write = (dir, rel, text) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const H = (purpose, when, related) => `Purpose: ${purpose}\nRead this when: ${when}\nRelated files: ${related}\n\nStatus: Approved (benchmark fixture)\n`;

function storyBlock(s) {
  return `### ${s.id} ${s.title}\n\nAs a ${s.asA}, I want ${s.iWant} so that ${s.soThat}.\n\nPriority: Must\n\nAcceptance criteria:\n\n\`\`\`gherkin\n${s.gherkin}\n\`\`\`\n`;
}
const frBlock = r => `### ${r.id} ${r.title}\n\n${r.text}\n\n- Traces to: ${r.traces.join(', ')}\n`;
const nfrBlock = r => `### ${r.id} ${r.title}\n\n${r.text}\n\n- Threshold: ${r.threshold}\n- Checked by: ${r.check}\n`;
const commands = t => `- Fast checks: \`${t.checks.fast}\`\n- Full checks: \`${t.checks.full}\`\n- Acceptance tests (tests/acceptance/): \`${t.checks.acceptance}\``;

export function renderSpec(t) {
  return [
    `# ${t.title}`, '', t.summary, '', '## Users', '', t.users, '',
    '## Not in scope', '', ...t.nonGoals.map(n => `- ${n}`), '',
    '## Interface and constraints', '', t.interface, '',
    '## User stories', '', ...t.stories.map(storyBlock),
    '## Functional requirements', '', ...t.frs.map(frBlock),
    '## Non-functional requirements', '', ...t.nfrs.map(nfrBlock),
    '## Suggested modules', '', ...t.modules.map(m => `- **${m.name}:** ${m.text}`), '',
    '## Suggested order of work', '', ...t.steps.map(s => `${s.n}. ${s.title} (${s.stories.join(', ')})`), '',
    '## Commands', '', commands(t), ''
  ].join('\n');
}

function renderPilotDocs(t) {
  return {
    'docs/requirements/PRD.md': [`# ${t.title} — PRD`, '', H('why, who and what (user stories).', 'you need a story or its acceptance criteria.', 'docs/requirements/SRS.md'),
      '## Vision', '', t.summary, '', '## Users and personas', '', t.users, '', '## Scope', '', '### Non-goals', '', ...t.nonGoals.map(n => `- ${n}`), '',
      '## User stories', '', ...t.stories.map(storyBlock)].join('\n'),
    'docs/requirements/SRS.md': [`# ${t.title} — SRS`, '', H('functional and non-functional requirements by ID.', 'you implement or test a requirement; grep its ID.', 'docs/requirements/PRD.md, docs/requirements/TECH-SPEC.md'),
      '## Functional requirements', '', ...t.frs.map(frBlock), '## Non-functional requirements', '', ...t.nfrs.map(nfrBlock),
      '## Architecture', '', 'See docs/requirements/TECH-SPEC.md.', ''].join('\n'),
    'docs/requirements/TECH-SPEC.md': [`# ${t.title} — Technical Specification`, '', H('how the system is built.', 'you change a module.', 'docs/requirements/SRS.md'),
      '## Interface and constraints', '', t.interface, '', '## Building blocks', '', ...t.modules.map(m => `### Module: ${m.name}\n\n${m.text}\n`), ''].join('\n'),
    'docs/planning/ROADMAP.md': [`# Roadmap`, '', H('the build steps /pilot:step executes, in order.', 'you start a step.', 'docs/planning/PROGRESS.md'),
      ...t.steps.map(s => `## Step ${s.n} ${s.title}\n\n- Stories: ${s.stories.join(', ')}\n- Exit criteria: acceptance tests for these stories pass; review verdict pass\n`)].join('\n'),
    'docs/planning/PROGRESS.md': [`# Progress`, '', H('status of every roadmap step.', 'you need to know what is finished.', 'docs/planning/ROADMAP.md'),
      '| Step | Status | Review | Date |', '| --- | --- | --- | --- |', ...t.steps.map(s => `| ${s.n} | todo | - | - |`), ''].join('\n'),
    'docs/planning/HANDOFF.md': [`# Handoff`, '', H('state for the next session.', 'every session.', 'docs/planning/ROADMAP.md'),
      '## Current step', '', 'Not started. All requirement docs are approved.', '', '## Next action', '', '/pilot:step 1', ''].join('\n')
  };
}

function run(cmd, args, cwd) {
  // npm is a .cmd shim on Windows and needs a shell; everything else runs without one so arguments stay intact.
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npm' });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed in ${cwd}:\n${r.stderr || r.stdout}`);
  return r.stdout;
}

/** Create the workspace for (task, arm) in `dir`. Returns { initialSha }. */
export function buildWorkspace(taskId, arm, dir, { install = true } = {}) {
  const t = loadTask(taskId);
  fs.mkdirSync(dir, { recursive: true });
  copyDir(path.join(TASKS, '_shared', t.stack === 'web-ts' ? 'ts-workspace' : 'py-workspace'), dir);
  copyDir(path.join(TASKS, taskId, 'workspace'), dir);
  fs.mkdirSync(path.join(dir, 'tests', 'acceptance'), { recursive: true });

  if (arm === 'vanilla') {
    write(dir, 'SPEC.md', renderSpec(t));
  } else if (arm === 'pilot' || arm === 'pilot-saver') {
    // pilot-saver is the same kit with the saver model profile; it runs only when asked for (--arms).
    const answers = path.join(dir, '..', `${path.basename(dir)}-answers.json`);
    fs.writeFileSync(answers, JSON.stringify({
      project_name: t.title, projectType: t.projectType, stack: t.stack, profile: arm === 'pilot-saver' ? 'saver' : 'pro', hasAI: t.hasAI,
      design: 'not-applicable', checks: t.checks, stack_summary: t.stack === 'web-ts' ? 'Node.js 24, TypeScript (type stripping), node:test' : 'Python 3.11+, standard library, unittest'
    }));
    run(process.execPath, [path.join(PLUGIN, 'scripts', 'pilot.js'), 'scaffold', '--project', dir, '--answers', answers], dir);
    for (const [rel, text] of Object.entries(renderPilotDocs(t))) write(dir, rel, text);
    run(process.execPath, [path.join(PLUGIN, 'scripts', 'pilot.js'), 'record', '--project', dir], dir);
    run(process.execPath, [path.join(PLUGIN, 'scripts', 'pilot.js'), 'trace', '--project', dir, '--write'], dir);
    fs.rmSync(answers, { force: true });
  } else throw new Error(`unknown arm ${arm}`);

  if (install && t.stack === 'web-ts') run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], dir);
  fs.appendFileSync(path.join(dir, '.gitignore'), '\nnode_modules/\n.bench-hidden/\n__pycache__/\n');
  run('git', ['init', '-q', '-b', 'main'], dir);
  run('git', ['-c', 'user.email=bench@example.com', '-c', 'user.name=bench', 'add', '-A'], dir);
  run('git', ['-c', 'user.email=bench@example.com', '-c', 'user.name=bench', 'commit', '-qm', 'benchmark start'], dir);
  return { initialSha: run('git', ['rev-parse', 'HEAD'], dir).trim() };
}

export const prompts = {
  vanilla: 'Implement everything in SPEC.md. Work until it is complete.',
  pilot: 'Run /pilot:step for each step in docs/planning/ROADMAP.md, in order, until all steps are done.'
};
prompts['pilot-saver'] = prompts.pilot;
