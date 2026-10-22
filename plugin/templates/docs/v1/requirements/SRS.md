# {{project_name}} — Software Requirements (SRS)

Purpose: every functional (FR-###) and non-functional (NFR-###) requirement, each traced to a user story.
Read this when: you implement, test or review a requirement; grep its ID and read only that section.
Related files: docs/requirements/PRD.md (stories), docs/requirements/TECH-SPEC.md (architecture and stack)

Status: Draft

Structure follows ISO/IEC/IEEE 29148. Requirements use EARS syntax. Non-functional requirements use ISO/IEC 25010 categories. This doc owns FR-### and NFR-###.

## Purpose and scope

See docs/requirements/PRD.md for vision and scope. This document lists the requirements only.

## Definitions

See docs/GLOSSARY.md.

## Functional requirements

### FR-001 {{title}}

When {{trigger}}, the system shall {{response}}.

- Traces to: US-001
- Verified by: US-001 acceptance criteria

## Non-functional requirements

### NFR-001 Accessibility

The user interface shall meet WCAG 2.2 level AA.

- Category: usability (ISO 25010)
- Threshold: zero axe-core violations of level A or AA on every page
- Checked by: automated accessibility test in CI

### NFR-002 Capacity and response time

The system shall serve {{N}} concurrent users at {{R}} requests per second with 95% of requests answered within {{T}} ms, and stay available {{99.x}}% of each month.

- Category: performance efficiency and reliability (ISO 25010)
- Threshold: {{numbers from the interview's architecture and scale phase}}
- Checked by: load test script ({{k6 or similar}}) run before release

### NFR-003 {{title}}

{{statement with a measurable threshold}}

- Category: {{performance efficiency | reliability | security | compatibility | maintainability | portability}}
- Threshold: {{number and unit}}
- Checked by: {{test or tool}}

## Languages and right-to-left text

{{languages}}. All user-facing text is kept in translation files, not in code.

## Architecture

One paragraph only. Details live in docs/requirements/TECH-SPEC.md.

## Chosen stack

One paragraph only. See docs/requirements/TECH-SPEC.md and the stack decision in docs/decisions/.
