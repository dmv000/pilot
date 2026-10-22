// Test-only migration (not shipped): proves chaining v1 -> v2 -> v3 in one run.
export default {
  from: 'v2',
  to: 'v3',
  describe: 'Fixture: edits the file v2 created',
  operations: [
    {
      id: 'risks-table',
      describe: 'RISKS.md gets a table header',
      file: 'docs/planning/RISKS.md',
      transform: text => (text.includes('| Risk |') ? text : text.replace(/\s*$/, '\n\n| Risk | Likelihood | Impact | Mitigation |\n| --- | --- | --- | --- |\n'))
    }
  ]
};
