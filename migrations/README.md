# Migrations

Purpose: how project files move from one pilot template version to the next.
Read this when: you change a template in plugin/templates/ (docs, settings, rules or github).
Related files: docs/design/P2-spec.md (section 11), .pilot/manifest.json in each project.

v1 has nothing to migrate from. The first template change ships `v1-to-v2.js` and the `/pilot:migrate` skill together.

A migration exports a list of operations. Each one has:

- `appliesTo`: project-relative glob
- `describe`: one sentence shown to the owner
- `apply(content) -> content`: pure and idempotent

The runner, `/pilot:migrate`:

1. Backs up every target to `.pilot/backups/<timestamp>/`.
2. Writes files whose hash still equals the manifest's recorded hash. These are files nobody edited.
3. Shows a diff for every edited file and applies it only on approval.
4. Updates `templateVersion` and the file hashes.

Golden projects in `tests/golden-projects/` cover three states: untouched, edited and half-migrated. Running a migration twice must equal running it once.
