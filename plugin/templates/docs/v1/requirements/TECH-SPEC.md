# {{project_name}} — Technical Specification

Purpose: how the system is built: architecture, modules, data, APIs, and how each NFR is met.
Read this when: you change a module; read only the section "Module: <name>" you need.
Related files: docs/requirements/SRS.md (requirements by ID), docs/decisions/ (why)

Status: Draft

Structure follows arc42, trimmed. Diagrams use C4 in Mermaid. This doc refers to requirements by ID and never restates them.

## Context and scope

```mermaid
flowchart LR
  user[{{persona}}] --> system[{{project_name}}]
  system --> ext[{{external system}}]
```

## Constraints

- {{constraint}}

## Solution strategy

- {{decision}} (see ADR-0001)

## Building blocks

### Module: {{name}}

- Responsibility: {{one sentence}}
- Public interface: {{functions, endpoints or commands}}
- Serves: FR-001

## Data model

| Entity | Fields | Rules |
| --- | --- | --- |
| {{entity}} | {{fields}} | {{invariants}} |

## APIs

| Method and path or command | Input | Output | Errors |
| --- | --- | --- | --- |
| {{endpoint}} | {{input}} | {{output}} | {{errors}} |

## How each NFR is met

| NFR | Mechanism | Test |
| --- | --- | --- |
| NFR-001 | {{mechanism}} | {{test}} |

## Cross-cutting concerns

- Authentication and authorization: {{approach}}
- Error handling: {{approach}}
- Logging: {{approach}}; never log secrets or personal data
- Internationalization: {{approach}}

## Fitness functions

- {{automated check that keeps module boundaries, for example a lint dependency rule}}

## Risks and technical debt

- {{risk}}
