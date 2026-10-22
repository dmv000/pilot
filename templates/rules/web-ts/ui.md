---
paths:
  - "src/**/*.tsx"
  - "src/**/*.vue"
  - "src/**/*.svelte"
---

# UI

- Follow docs/design/DESIGN.md and tokens.json when they exist; never hard-code colors or spacing that tokens define.
- Meet WCAG 2.2 AA: semantic elements, labels on inputs, visible focus, contrast, no information by color alone.
- All user-facing text goes through the translation layer. Layout must survive right-to-left text when the SRS asks for it.
- Check UI changes visually: take a screenshot and compare it with the design.
