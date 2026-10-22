# ADR-0001 Record architecture decisions

Purpose: records why the project writes Architecture Decision Records.
Read this when: you want to know how decisions are recorded here.
Related files: docs/requirements/TECH-SPEC.md

Status: Draft

Format: MADR (short form). Status: accepted. Date: {{date}}

## Context and problem

Decisions made during the build need a durable reason that a fresh session can read.

## Options considered

1. No records: fastest, but reasons are lost between sessions.
2. One ADR file per significant decision: small cost, reasons survive.

## Decision

Option 2. Each significant decision gets `docs/decisions/NNNN-<slug>.md` with context, options, decision and consequences, linked to requirement IDs.

## Consequences

- Positive: reviewers and future sessions can check decisions against their reasons.
- Negative: a few minutes per decision.
