# Interview question bank

Use these as starting points, not a script. Ask 2–4 per round. Every option says what it means in practice. Adapt the wording to the owner's idea; keep it plain.

## Phase 1 — Detect (no questions if obvious)

Already handled in SKILL.md step 0.

## Phase 2 — Vision

- What problem does this solve, and for whom? (free text through "Other" is fine)
- Why build it now? Options: a deadline; a current workaround is painful; a new opportunity; learning project.
- How will you know it worked? Offer measurable options that fit the idea (for example "100 weekly users", "replaces the spreadsheet", "saves 1 hour a day").

## Phase 3 — Users

- Who are the main users? Offer 2–3 likely personas plus Other.
- What job are they trying to get done when they reach for this?
- Which 3 journeys matter most? (for example: sign up → first result; daily use; admin task)

## Phase 4 — Scope

- What must the first usable version (MVP) do? Offer the candidate features as a multi-select.
- What is explicitly NOT in scope? Offer likely non-goals to rule out.
- What comes later, after the MVP?

## Phase 5 — Features and acceptance

For each MVP feature, confirm the observable behavior: "When <someone> does <action>, they should see <result>." These become Gherkin acceptance criteria and then tests.

## Phase 6 — Quality (non-functional)

- How fast must the main action feel? Options: instant (<200 ms), quick (<1 s), can take a few seconds.
- How many users at once in the first year? Options: just me; tens; hundreds; thousands+.
- What if it is down for an hour? Options: nobody notices; annoying; costs money; unacceptable.
- What data is sensitive? Options: none; emails/names; payments; health or similar. Explain that sensitive data raises the security level.
- Accessibility: default is WCAG 2.2 AA (works with screen readers and keyboard). Ask only if they want more or less.
- Languages: which languages? Any right-to-left language such as Arabic or Hebrew?

## Phase 7 — Platform and stack

- Do you already have a preference for language/framework/hosting? If not, say you will research 2–3 options and show the trade-offs (research-stack).
- Where will it run? Options that fit the project type.

## Phase 7b — Architecture and scale

Read [architecture.md](architecture.md) before this phase. Ask about needs first, never "which architecture do you want?" as an opening question. Most owners cannot answer that, and the needs decide it.

- How many people will use it at the same time: in the first months, and in one or two years? Options: a handful; hundreds; thousands; hundreds of thousands or more. Explain that this decides how much "scale" machinery is worth building now.
- Is the traffic steady, or are there sudden peaks? Options: steady; daily peaks; rare huge spikes (sales, launches); unknown.
- How fast must the main action respond, and how bad is downtime? This links to Phase 6; reuse those answers.
- How many developers will work on it, and must parts be released separately? Options: just me; one small team; several teams. Explain that several independent teams is the main real reason for microservices.
- Are there heavy or slow jobs: reports, imports, AI calls, video, emails? These usually belong in a background queue.
- Must data always be exactly up to date everywhere (bank balance), or is "correct within seconds" fine (like counts)?
- Will it ever need to run in several regions or countries, or work offline?

Then:
1. Pick the load tier from architecture.md section 3.
2. Propose one architecture style from section 1 and the few patterns from section 2 that solve named problems. Give each in one plain sentence with its cost. Offer one simpler and one more scalable alternative.
3. If the owner says "I don't know", recommend the simplest style that meets the answers, usually a modular monolith with clean-architecture layers inside. Log it in ASSUMPTIONS.md.
4. Turn the load answers into NFRs with numbers in SRS.md: capacity, latency, availability and a load test.

Record the choice and pass it to the architect, who writes the Tech Spec sections, the ADR, `.claude/rules/architecture.md` and the fitness-function step (architecture.md section 4).

## Phase 8 — Data and integrations

- What are the main things it stores? (entities)
- Which outside services must it talk to? Options: payments; email; login provider (Google, GitHub…); maps; AI model; none.
- How do people log in? Options: no login; email+password; social login; company single sign-on.

## Phase 9 — Design

- Do you have a brand (colors, fonts, logo)? Options: yes, I'll share it; no, propose one; not decided yet.
- Any apps or sites whose look you like?
- Tone: playful; neutral; formal.
- If the owner is not ready: set design to pending and explain the reminder. For projects with no UI, design is not-applicable.

## Phase 10 — AI-specific (only if the product contains AI)

- What should the AI do, and for whom? What must it never do or say?
- Which tools or data may it use?
- How should it handle uncertainty or a request it must refuse?
- How will we know answers are good? Offer: example questions with expected answers; human review; both.

## Phase 11 — Constraints

- Budget for hosting and services per month?
- Deadline?
- Who works on it? Options: just me with Claude; a small team.

## Phase 12 — Working agreement

- How much should Claude do without asking? Options: ask before each phase (default); ask only for risky actions; ask before every change.
- Quality bar: default is tests first for logic and 80% coverage on changed lines. Keep, raise, or lower?
- Are you on the Claude Pro or Max plan? This picks the model profile.
