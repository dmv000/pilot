---
max_turns: 30
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Edit, Write, Bash, Agent]
tags: [F12, implementer]
---

Use the pilot:implementer agent for this delegation, then report its result:

Objective: make tests/acceptance/slug.test.js pass.
Requirement FR-001: When a title is given, the system shall return a lowercase slug with words joined by single hyphens and no characters other than a-z, 0-9 and hyphens.
Target files you may change: src/slug.js, tests/unit/slug.test.js
Definition of Done: node --test passes. Do not change other files.
