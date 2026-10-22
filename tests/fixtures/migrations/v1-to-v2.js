// Test-only migration (not shipped). Exercises every operation type the runner supports.
export default {
  from: 'v1',
  to: 'v2',
  describe: 'Fixture: adds a Blockers section, a key-file deny rule, a risks doc, and a rule line',
  operations: [
    {
      id: 'handoff-blockers',
      describe: 'HANDOFF.md gets a "## Blockers" section',
      file: 'docs/planning/HANDOFF.md',
      transform: text => (/^## Blockers$/m.test(text) ? text : text.replace(/\s*$/, '\n\n## Blockers\n\n- None.\n'))
    },
    {
      id: 'deny-key-files',
      describe: 'settings deny reading *.key files',
      file: '.claude/settings.json',
      json: s => {
        s.permissions = s.permissions ?? {};
        s.permissions.deny = s.permissions.deny ?? [];
        if (!s.permissions.deny.includes('Read(./**/*.key)')) s.permissions.deny.push('Read(./**/*.key)');
        return s;
      }
    },
    {
      id: 'risks-doc',
      describe: 'new docs/planning/RISKS.md',
      create: 'docs/planning/RISKS.md',
      content: 'Purpose: project risks.\nRead this when: planning.\nRelated files: docs/planning/ROADMAP.md\n\n# Risks\n'
    },
    {
      id: 'tests-rule-line',
      describe: 'tests rule gains a line about flaky tests',
      file: '.claude/rules/common/*.md',
      transform: (text, ctx) => (!text.includes('# Tests') || text.includes('Flaky tests')) ? text : text.replace(/\s*$/, '\n- Flaky tests are bugs: file them with /pilot:bug.\n')
    }
  ]
};
