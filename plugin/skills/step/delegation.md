# Delegation templates

Fill every `<…>` with exact paths, IDs and text. A subagent sees nothing but this prompt and the files it reads.

## A. test-writer

```text
Objective: write failing acceptance tests for <US-…> in <tests/acceptance/<area>.test.<ext>>.
Requirements (verbatim from SRS.md): <paste FR text with IDs>
Acceptance criteria (verbatim Gherkin from PRD.md): <paste>
Public interface to test against (from TECH-SPEC.md): <endpoints / functions / CLI usage>
Rules:
- One or more tests per Gherkin scenario; tag each with "@req FR-…".
- Test observable behavior through the public interface only.
- Run them with: <checks.acceptance>. They must fail because the feature is missing. Show the failure lines.
Do not write production code. Do not edit files outside tests/acceptance/.
Return: the test file paths, the command you ran, and the key failure lines (≤ 15 lines).
```

## B. implementer

```text
Objective: make these acceptance tests pass: <paths>.
Requirements: <paste FR text with IDs>
Target files you may change: <paths or directories>
Design to follow: <TECH-SPEC module section path> and <ADR paths>.
Definition of Done:
- <checks.acceptance> passes for these tests; <checks.fast> passes.
- Logic has unit tests written first (red, then green); tag tests with "@req FR-…" where they verify a requirement.
- No TODO/FIXME without "(#issue)". No skipped tests.
Do not edit tests/acceptance/** (a hook blocks it). If a test seems wrong, stop and explain why with evidence.
Do not change files outside the targets unless required; list any such change and why.
Return: files changed, commands run with exit codes, anything not done.
```

## C. code-reviewer

```text
Review the diff <git diff command or range> against <FR IDs>.
Requirements: <paste FR text>. Acceptance criteria: <paste Gherkin>.
Report only findings that affect correctness, security, or a stated requirement. Style preferences and speculative "might need later" items are not findings.
For each finding: severity (major = wrong behavior or missing requirement; minor = edge case or maintainability risk with a concrete failure), file:line, requirement ID, the concrete failure scenario.
Return JSON: { "verdict": "pass" | "fail", "findings": [ … ] }. Verdict is fail if any major finding exists.
```

## D. doc-keeper

```text
Step <N> passed: review file .pilot/reviews/step-<N>.json (acceptance exit 0, verdict pass).
Update:
- docs/planning/PROGRESS.md: row for step <N> → "| <N> | done | .pilot/reviews/step-<N>.json | <date> |".
- docs/planning/HANDOFF.md: current step, last result with evidence (the acceptance command and exit code), next action "/pilot:step <N+1>", open questions. Keep under 8,000 characters.
- docs/LESSONS.md: add entries for mistakes found in this step: <list, or "none">.
Change nothing else. Return the list of files changed.
```
