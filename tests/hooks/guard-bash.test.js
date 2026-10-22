// T-H03: guard-bash (F02, F06).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tmpProject, runHook, decision } from '../helpers.js';

const run = (dir, command, tool_name = 'Bash') =>
  decision(runHook('guard-bash.js', dir, { hook_event_name: 'PreToolUse', tool_name, tool_input: { command } }));

test('blocks commands that print secrets', () => {
  const dir = tmpProject();
  for (const cmd of ['cat .env', 'cat ./config/.env.local', 'type .env', 'less ~/.ssh/id_rsa', 'head -n 3 server.pem',
    'grep KEY .env', 'base64 .env', 'node -e "1" < .env', 'printenv', 'env', 'cat .aws/credentials']) {
    assert.equal(run(dir, cmd), 'deny', cmd);
  }
  assert.equal(run(dir, 'Get-Content .env', 'PowerShell'), 'deny');
  assert.equal(run(dir, 'Get-ChildItem env:', 'PowerShell'), 'deny');
});

test('allows ordinary reads and the example env file', () => {
  const dir = tmpProject();
  for (const cmd of ['cat README.md', 'cat .env.example', 'grep -r TODO src', 'npm test', 'env NODE_ENV=test npm test', 'ls -la']) {
    assert.equal(run(dir, cmd), 'allow', cmd);
  }
});

test('blocks hook bypass and force-push to the default branch', () => {
  const dir = tmpProject();
  assert.equal(run(dir, 'git commit -m "x" --no-verify'), 'deny');
  assert.equal(run(dir, 'git push --force origin main'), 'deny');
  assert.equal(run(dir, 'git push -f origin master'), 'deny');
  assert.equal(run(dir, 'git push origin feature/x'), 'allow');
  assert.equal(run(dir, 'git push --force-with-lease origin feature/x'), 'allow');
});
