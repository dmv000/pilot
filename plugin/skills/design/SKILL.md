---
name: design
description: Create the project's design system - design rules (DESIGN.md), tokens (tokens.json) and a generated preview page - and clear the design-pending reminder.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*)
---

# /pilot:design

The design system has two sources and one generated view:
- `docs/design/DESIGN.md`: rules Claude follows
- `docs/design/tokens.json`: every value, the source of truth
- `docs/design/preview.html`: generated from the two; never edited by hand

## 1. Start from the templates

Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" design-init`. It copies the kit's DESIGN.md and tokens.json into `docs/design/` and never overwrites existing files. The starter tokens are neutral and already pass contrast checks.

## 2. Interview

Use AskUserQuestion: plain language, 2–4 questions per round, and explain terms. For example, a "design token" is a named value, such as a color or a spacing size, that every screen uses.

Ask about:
- **Brand:** existing colors, fonts and logo, or propose new ones.
- **References:** apps or sites whose look they like.
- **Tone:** playful, neutral or formal.
- **Density:** airy or compact.
- **Dark mode:** yes or no.
- **Languages:** which ones, and right-to-left text (check SRS.md first).
- **Accessibility target:** WCAG 2.2 AA by default.
- **Components:** the ones the product needs first (buttons, inputs, cards, navigation, ...).

Never invent a brand color the owner did not give. If they have none, propose 2–3 options with their contrast ratios and let them choose.

## 3. Fill the two sources

- **tokens.json:** replace the starter values with the chosen ones. Keep every leaf as `{ "$type", "$value" }`. Keep `$pilot.contrastPairs` listing every text/background pair the UI will use (minimum 4.5 for text, 3 for large text and UI parts). Add `color-dark.*` tokens and their pairs if dark mode is in scope.
- **DESIGN.md:** fill every `{{placeholder}}`. Write rules, not values: refer to tokens by name. Add one row per component in the Components table.

## 4. Check and preview

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" design-check`. Fix every ERROR, typically a failed contrast pair, then run it again until it passes.
2. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" preview` to generate `docs/design/preview.html`.

## 5. Finish

1. Ask the owner to open `docs/design/preview.html` and approve, or ask for changes. Repeat steps 3–4 until approved, then set `Status: Approved (date)` in DESIGN.md.
2. Set `design` to `done` in `.pilot/manifest.json`. The owner approves the edit prompt. This clears the "design system not created yet" reminder.
3. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" record docs/design/DESIGN.md docs/design/tokens.json`.

From now on, `/pilot:step` sends UI changes to the `pilot:design-reviewer` agent, and the project's CI runs design-check on every push.
