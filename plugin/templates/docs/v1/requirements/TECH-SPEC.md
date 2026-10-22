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

## Architecture style

- Style: {{simple layered | clean/hexagonal | modular monolith | microservices | event-driven | serverless | other}} (see ADR-0002)
- Why: {{one or two sentences, each tied to a requirement ID or constraint}}
- Load tier: {{0 | 1 | 2 | 3}} (from the interview; numbers are in the SRS capacity NFRs)
- Dependency rule: {{for example: domain imports nothing from adapters or frameworks}}. Enforced by {{fitness function, for example dependency-cruiser / import-linter}} in `checks.full`.
- Revisit when: {{the condition that would change this choice}}

## Design patterns

| Pattern | Where | Problem it solves |
| --- | --- | --- |
| {{pattern}} | {{module or path}} | {{named problem; a pattern without one is removed}} |

## Scalability and load

| Concern | Approach | Proven by |
| --- | --- | --- |
| Concurrent users and throughput | {{stateless instances, autoscaling, ...}} | {{load test script and NFR ID}} |
| Hot reads | {{indexes, cache-aside with TTL, CDN}} | {{test}} |
| Slow or spiky work | {{queue and background workers}} | {{test}} |
| Abuse and overload | {{rate limiting, backpressure}} | {{test}} |
| Outside dependencies failing | {{timeouts, retries with backoff, circuit breaker, graceful degradation}} | {{test}} |
| Data growth | {{pagination, archiving, partitioning when needed}} | {{test}} |
| Observability | {{logs, metrics, traces; SLO alerts}} | {{dashboard or alert}} |

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
