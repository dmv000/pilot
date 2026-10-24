---
name: debug
description: Fix a failing test or bug in at most 3 focused attempts, then stop and report. Use when a test fails or a bug must be fixed.
argument-hint: "<bug id, failing test, or symptom>"
allowed-tools: Bash(node *scripts/pilot.js*), Bash(git diff *), Bash(git status)
---

# /pilot:debug — bounded fix

Target: $ARGUMENTS

Debugging is where most tokens go. Work narrowly and stop early.

## 1. Reproduce with the narrowest command

- Run only the failing test file or case, never the whole suite. If you were sent here by the end-of-turn check, its message already holds the failure: start from it.
- If nothing reproduces the bug yet, dispatch `pilot:test-writer` (model: sonnet) to write one failing regression test tagged `@req <ID>` (or the bug's ID) that shows it. A bug without a failing test is not ready to fix.
- Start the attempt log `.pilot/tmp/debug.md`: the command and the key failure lines (at most 15).

## 2. Read only what the error points to

- Read the project files named in the stack trace or failure message, and the code under test. Nothing else yet.
- For a wider search, dispatch `pilot:explorer` (model: haiku) with a precise question and use its summary; do not read whole folders yourself.
- Check `docs/LESSONS.md` and `docs/issues/RESOLVED.md` for the same symptom.

## 3. Up to 3 attempts

For each attempt, write to the log first: **hypothesis** (one line), **evidence** for it, **planned change**. Then:

1. Make the smallest change that tests the hypothesis.
2. Rerun the narrow command.
3. Record the result. A hypothesis that failed is ruled out: never retry it, and undo its change before the next attempt.

Never weaken, skip or edit a test to make it pass. If you believe the test is wrong, stop and show why with evidence.

## 4a. Fixed

1. Run `checks.fast` from `.pilot/manifest.json` once.
2. If a bug record exists, fill its "Root cause" and "Regression test" (see `/pilot:bug`).
3. Report: the cause, the change, the test that now guards it.

## 4b. Not fixed after 3 attempts: stop

1. Undo the changes of the failed attempts, unless one made a real improvement; then say which.
2. Add the attempt log to the bug record (`/pilot:bug` creates one if none exists), under "What was tried": each hypothesis and what ruled it out.
3. Tell the owner in plain words what is known and what is not, and ask how to continue. Options: they give a hint or more context; one more attempt with a stronger model (`pilot:implementer` with model opus, which uses more of the plan's limits); or leave it recorded for later.

Do not start a fourth attempt without the owner's answer. The end-of-turn check enforces the same limit.
