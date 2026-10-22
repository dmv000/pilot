# Interview branches by project type

| Type | Phases to adapt | Add | Default stack pack | Design |
| --- | --- | --- | --- | --- |
| web-app | all | browsers to support; SEO needs; offline? | web-ts | pending (ask) |
| mobile-app | all | iOS, Android or both; app-store accounts; push notifications; offline use | generic unless React Native/TS (web-ts) | pending (ask) |
| script | Phase 3 shrinks to "who runs it and how"; Phase 9 skipped | input/output formats; how it is run (cron, CLI, CI); exit codes; error messages | web-ts for Node/TS, else generic | not-applicable |
| os | Phases 3, 9 skipped | target hardware/architecture; boot process; toolchain and emulator; memory limits; how tests run (QEMU, hardware) | generic | not-applicable |
| ai-system | all, plus Phase 10 in depth | model provider and fallback; data the AI may see; human review loop; evaluation set | web-ts or generic | pending if it has a UI, else not-applicable |
| other | ask which of the phases apply | whatever the owner's domain needs | generic | ask |

For `generic` projects, the interview must produce the three commands pilot needs:

- `checks.fast`: lint, type check and unit tests, ideally under 60 seconds. The end-of-turn gate runs this.
- `checks.full`: everything CI runs.
- `checks.acceptance`: only the acceptance tests in `tests/acceptance/`.

If the owner does not know them yet, Step 1 of the roadmap creates them, and the manifest gets them then (through `/pilot:doctor`, with approval).
