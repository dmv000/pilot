---
name: design
description: Create the project's design system - design rules (DESIGN.md), tokens (tokens.json) and a generated preview page - and clear the design-pending reminder.
disable-model-invocation: true
allowed-tools: Bash(node *scripts/pilot.js*)
---

# /pilot:design

1. **Interview** (AskUserQuestion, plain language, 2–4 questions per round). Explain terms such as "design token" (a named value like a color or spacing used everywhere).
   - Brand: existing colors, fonts and logo, or propose new ones.
   - Reference products whose look they like.
   - Tone: playful, neutral, formal.
   - Density: airy or compact.
   - Light and dark mode.
   - Languages and right-to-left text (from SRS.md).
   - Accessibility target (default WCAG 2.2 AA).
2. **Write `docs/design/tokens.json`.** This is the source of truth for values, using `{ "$value": …, "$type": … }` leaves. Cover:
   - color (with contrast-checked text/background pairs)
   - typography (font families, size scale, line heights)
   - spacing, radius, shadow, motion
3. **Write `docs/design/DESIGN.md`**, starting with the three-line header. It holds the rules Claude follows:
   - principles and layout grid
   - how to use each token group
   - components with their states (default, hover, focus, active, disabled, error)
   - accessibility rules (focus visible, contrast ≥ 4.5:1 for text, no meaning by color alone, reduced motion)
   - right-to-left rules if needed
   - UI verification steps (screenshot compared against the design; automated accessibility check)
4. **Generate the preview:** run `node "${CLAUDE_PLUGIN_ROOT}/scripts/pilot.js" preview`. Never hand-edit `preview.html`.
5. **Clear the reminder.** Set `design` to `done` in `.pilot/manifest.json`. The owner approves the edit prompt. Then run `pilot.js record docs/design/DESIGN.md docs/design/tokens.json`.
6. **Tell the owner** to open `docs/design/preview.html` and approve or request changes.
