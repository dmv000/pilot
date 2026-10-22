# P0 Kick-off: questions before any research

Purpose: settle every row of section 0 marked **confirm** or **open**, plus the things the environment made unclear, in one batch, before Phase 1 starts.
Read this when: you want to know what was undecided at the start of the kit and what was chosen.
Related files: `Claude Code Project Kit — Master Prompt.md` (section 0, section 8), `docs/design/P1-evidence.md` (next).

Status: **Waiting for answers.** No research has been done. Nothing below is a recommendation backed by evidence; it is the list of decisions only the owner can make.

## Environment observed on 2026-10-22 [verified: ran the commands in this folder]

| Item | Found |
| --- | --- |
| Claude Code | 2.1.300 |
| Node / npm | v24.21.0 / 11.19.0 |
| git | 2.56.0 (no global user.name / user.email; a repo-local identity was set for this repo's commits) |
| `gh` CLI | **not installed** (6.10 issue-sync hypothesis uses it) |
| Local transcripts (`~/.claude/projects/`) | 4 project folders: `Desktop-GTFO-Ai-Projects`, `Desktop-Goop`, `Desktop-Mill`, `Desktop-Master-pilot`, plus one scratch workspace |
| This folder | not a git repo until this commit; contains only the master prompt |

## Batch 1: section 0 rows marked confirm / open

### Q1. Kit name (row 16, open)
Every component is namespaced by this name (`/name:new`, `@agent-name:architect`, `npx name setup`), so it should be short, lowercase, and free on npm and as a GitHub repo. Availability is not yet checked (no research before answers).

- A. `pilot` (matches this folder, "Master pilot"; reads well: `/pilot:new`, `/pilot:step 3`)
- B. `forge`
- C. `keel`
- D. Other (type it)

### Q2. AI docs (row 9, confirm)
Proposed: two separate sets. Product AI docs (persona, tools, cognitive architecture, guardrails, eval set) only when the product contains AI; Claude's behaviour as builder lives in the kit core (output style + rules).

- A. Confirm as proposed
- B. Always generate the product AI docs, even for non-AI products (as empty stubs)
- C. Merge both into one "AI" folder
- D. Other

### Q3. Quality bar (row 14, confirm)
Proposed: tests first for logic (not pure UI); 80% coverage on changed lines; CI on GitHub Actions.

- A. Confirm as proposed
- B. Confirm, but raise to 90% on changed lines
- C. Confirm, but make the coverage threshold a per-project interview question
- D. Other

### Q4. Languages, RTL, accessibility (row 15, confirm)
Proposed: asked per project in the interview; default WCAG 2.2 AA and translation-ready text.

- A. Confirm as proposed
- B. Confirm, and also default every UI project to RTL-ready (bidirectional layout) unless the interview says no
- C. Confirm, but lower the default to WCAG 2.2 A
- D. Other

## Batch 2: other things that are unclear

### Q5. Your own failure data (section 4A)
Phase 1 wants your transcripts and git history. The four transcript folders above are readable from this machine.

- A. Read all four transcript folders and the git history of GTFO Ai Projects, Goop, and Mill
- B. Read only some of them (say which)
- C. Skip my own data for now; use platform docs and prior art only
- D. Other

### Q6. License for the public kit
Needed for LICENSE and package.json before anything is published.

- A. MIT
- B. Apache-2.0
- C. Other

Also needed (free text): the GitHub user or org that will host the kit repo and marketplace.

### Q7. Dependence on an existing framework (6.9)
The prompt says to decide with evidence. This asks whether any outcome is off the table before the evidence is gathered.

- A. Decide with evidence in P1; depending on Superpowers (or another plugin) is acceptable if the evidence favours it
- B. Never depend on a third-party plugin; borrow ideas, reimplement in the kit
- C. Prefer depending on Superpowers unless the evidence is clearly against it
- D. Other

### Q8. `gh` CLI is not installed on this machine
The issue-sync hypothesis (`/kit:bug`, `/kit:sync`) assumes `gh`. Choices affect the design, not just this machine.

- A. I'll install `gh` myself; design around it, and `/kit:doctor` checks it is present and authenticated
- B. Design the sync on the GitHub REST API from Node (needs a token) so `gh` is optional
- C. `/kit:doctor` offers to install it (winget / brew / apt) with my approval
- D. Other

## Assumptions made to get this far (logged, reversible)

- A1. This folder is the kit repo, as the prompt's "To run it" note says; `git init` was run here. [assumption]
- A2. Commits in this repo are authored as the document's byline with the account email, set repo-locally, not globally. [assumption]
- A3. Row 13 ("Ask per phase") means: a stop at each of P0–P4, and no further permission gates within a phase except for irreversible actions. [assumption]

## Answers (2026-10-22)

Status: **Closed.** All rows settled; P1 may start.

| Q | Decision | Consequence |
| --- | --- | --- |
| Q1 Kit name | **`pilot`** | Namespace is `/pilot:new`, `@agent-pilot:architect`, `pilot:direct`, `npx pilot setup`. npm / GitHub availability still to check in P1; if taken, propose alternatives before P2. |
| Q2 AI docs | Confirmed as proposed | Product AI docs only when the product contains AI; builder behaviour in output style + rules. |
| Q3 Quality bar | Confirmed as proposed | Tests first for logic (not pure UI); 80% coverage on changed lines; CI on GitHub Actions. |
| Q4 i18n / a11y | Confirmed as proposed | Asked per project; defaults WCAG 2.2 AA and translation-ready text. |
| Q5 Own failure data | **External sources first.** Read local transcripts / project git history only if external evidence yields too few failure points. | P1 starts from platform docs, engineering posts, prior-art repos and their issue trackers. Local data is a logged fallback, read-only. |
| Q6 License / host | **MIT.** GitHub owner not given yet. | LICENSE = MIT. Ask for the GitHub user/org before anything is published (P4 at the latest). |
| Q7 Dependencies | Decide with evidence | Depending on Superpowers or another plugin is allowed if P1 evidence favours it. |
| Q8 `gh` CLI | Owner installs `gh` | Design issue sync around `gh`; `/pilot:doctor` checks presence and auth. |

Open for later: GitHub owner for the marketplace (Q6).
