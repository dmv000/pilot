# {{project_name}} — Design system

Purpose: the design rules Claude follows when building or changing UI; values live in tokens.json.
Read this when: you create or change anything a user sees.
Related files: docs/design/tokens.json (values, source of truth), docs/design/preview.html (generated), docs/requirements/SRS.md (accessibility and language requirements)

Status: Draft

This file holds rules. Every value (color, size, spacing, radius, shadow, duration) lives in `tokens.json` and is referenced by name, never copied here or hard-coded in code. `pilot.js design-check` enforces the token structure and color contrast. `preview.html` is generated; do not edit it.

## Principles

1. {{principle_1}} (for example "Clarity over decoration: every element earns its place.")
2. {{principle_2}}
3. {{principle_3}}

Tone: {{playful | neutral | formal}}. Density: {{airy | compact}}.

## Layout

- Grid: {{columns}} columns, gutter `space.{{gutter}}`, max content width {{max_width}}.
- Breakpoints: small < {{sm}}, medium < {{md}}, large ≥ {{md}}. Design small first.
- Spacing comes only from the `space.*` scale. No one-off margins.

## Typography

- Font families: `font.family.base` for text, `font.family.mono` for code.
- Sizes come from `font.size.*`. Body text is `font.size.md`; never below `font.size.sm` for readable text.
- Line height `font.lineHeight.body` for paragraphs, `font.lineHeight.tight` for headings.
- One `h1` per page. Heading levels never skip (h2 → h4 is wrong).

## Color

- Text on background uses only the pairs listed in `tokens.json` → `$pilot.contrastPairs`. design-check verifies each meets its minimum contrast.
- `color.primary` marks the single main action on a screen. `color.danger` is only for destructive actions and errors.
- Color is never the only signal. Errors also have an icon or text, and links are also underlined or otherwise distinct.
- {{dark mode: supported with color-dark.* tokens | not supported in v1}}

## Components

Every interactive component defines these states: default, hover, focus-visible, active, disabled, and (for inputs) error. A component without all of its states is not done.

| Component | Purpose | Tokens it uses | Notes |
| --- | --- | --- | --- |
| Button (primary) | The main action on a screen | color.primary, color.on-primary, radius.md, space.sm/md | One per screen |
| Button (secondary) | Other actions | color.surface, color.text, color.border | |
| Text input | Single-line entry | color.surface, color.border, color.danger (error) | Always has a visible label |
| {{component}} | {{purpose}} | {{tokens}} | {{notes}} |

## Accessibility (WCAG 2.2 AA unless the SRS says more)

- Every input has a visible `<label>`. Placeholder text is not a label.
- Focus is always visible (`focus-visible` style using `color.focus`), and focus order follows reading order.
- Text contrast ≥ 4.5:1; large text and UI parts ≥ 3:1 (enforced through `$pilot.contrastPairs`).
- Targets are at least 24 × 24 CSS pixels.
- Motion uses `motion.duration.*`, and respects `prefers-reduced-motion` by removing non-essential animation.
- Images have meaningful `alt` text, or `alt=""` when they are decorative.

## Languages and right-to-left

- All user-facing text comes from translation files, never inline in components.
- {{RTL: layout uses logical properties (margin-inline-start, not margin-left) so it mirrors in right-to-left languages | not required}}

## How to verify a UI change

1. Run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" design-check`. It must pass.
2. Take a screenshot of each changed screen at small and large width and compare it with these rules.
3. Run the automated accessibility check ({{axe-core / Playwright accessibility test}}) with zero violations of level A or AA.
4. Search the change for hard-coded colors or sizes. design-check warns about hex colors in UI source files.
