# {{project_name}} — Product Requirements (PRD)

Purpose: why this product exists, who it serves, and what it must do (user stories US-###).
Read this when: you need the reason behind a feature, a persona, or a story's acceptance criteria.
Related files: docs/requirements/SRS.md (requirements FR/NFR), docs/requirements/TECH-SPEC.md (how)

Status: Draft

This doc owns: vision, problem, users, scope, user stories (US-###), success metrics. Other docs refer to stories by ID and never restate them.

## Vision

{{vision}}

## Problem and why now

{{problem}}

## Users and personas

{{personas}}

## Jobs to be done

- When {{situation}}, I want to {{motivation}}, so I can {{outcome}}.

## Top journeys

1. {{journey_1}}

## Scope

### MVP

- {{mvp_item}}

### Later

- {{later_item}}

### Non-goals

- {{non_goal}}

## User stories

### US-001 {{story_title}}

As a {{persona}}, I want {{capability}} so that {{benefit}}.

Priority: Must

Acceptance criteria:

```gherkin
Scenario: {{scenario}}
  Given {{context}}
  When {{action}}
  Then {{outcome}}
```

## Success metrics

| Metric | Target | How measured |
| --- | --- | --- |
| {{metric}} | {{target}} | {{method}} |

## Open questions

- {{question}}
