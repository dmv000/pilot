# Architecture and scale guide

Purpose: what Claude uses to ask good architecture questions, explain the options in plain language, and recommend the simplest architecture that meets the project's real needs.
Read this when: the interview reaches "Architecture and scale" (questions.md), the architect agent drafts TECH-SPEC.md, or /pilot:adopt maps an existing system.
Related files: questions.md (phase 7b), patterns.md (every code and system pattern, one line each), big-systems.md (how the highest-traffic companies are built; tier 2 and 3 only), docs/requirements/TECH-SPEC.md (where the choice is recorded), docs/decisions/ (the ADR)

## The rule that comes first

**Choose the simplest architecture that meets the stated requirements, and make it easy to change later.**
- Design for about 10× the expected load in the next 1–2 years, not 1000×. Over-built systems cost more, ship later, and have more ways to fail.
- Every choice traces to a requirement: a load target in an NFR, a team-size constraint, a data rule. "Big companies do it" is not a reason.
- Record the decision as an ADR with the options rejected and why. State what would make you change it, for example "move to separate services if two teams need to deploy independently".

## 1. Architecture styles: what to offer and when

Explain each option to the owner in one plain sentence plus its cost. Recommend one.

| Style | In plain words | Fits when | Costs and risks |
| --- | --- | --- | --- |
| **Simple layered (or MVC)** | Code is split into presentation, logic and data layers; each talks to the next | Small apps, CRUD tools, scripts with a UI, one developer | Business rules can leak into controllers or the database layer as it grows |
| **Clean / hexagonal / onion (ports and adapters)** | Business rules sit in the middle and know nothing about the database, web framework or outside services; those plug in through interfaces | Apps with real business rules that must outlive frameworks; high testability needs; most medium web apps and APIs | More files and interfaces up front; overkill for thin CRUD |
| **Modular monolith** | One deployable app, split inside into modules with strict boundaries (each owns its data) | Most products from day one to a large scale; small-to-medium teams; the usual best default | Boundaries need enforcing (fitness functions) or they erode |
| **Microservices** | Many small apps, each deployed alone and owning its data, talking over the network | Several teams that must ship independently; parts with very different scaling or tech needs | Network failures, distributed data, many deployments, much harder debugging. Rarely right for a new product or a solo developer |
| **Event-driven** | Parts react to events ("order placed") through a message broker instead of calling each other | Workflows with many independent reactions; integrations; spiky background work | Harder to trace; eventual consistency; needs idempotent consumers |
| **Serverless** | Functions run on demand in a managed cloud; no servers to run | Spiky or low traffic, event processing, small teams that want little operations work | Cold starts, vendor lock-in, time limits, harder local testing |
| **CQRS / event sourcing** | Separate models for writing and reading; or store every change as an event | Complex domains with heavy audit needs or very different read and write loads | High complexity; only when a requirement demands it |

Non-web projects:
- **CLI or script:** a pipeline of pure functions plus a thin I/O shell (functional core, imperative shell).
- **Library:** a small public API and hidden internals, with semantic versioning.
- **OS or embedded:** layers from the hardware abstraction layer (HAL) through drivers and kernel services to user space, with a fixed memory budget.
- **AI system:** an orchestrator, tools behind adapters, guardrails at input and output, and evals. See docs/ai/.

## 2. Design patterns: use only when they solve a named problem

| Pattern | Solves | Typical place |
| --- | --- | --- |
| Repository | Keeps database code out of business logic; makes logic testable | Data access in clean/hexagonal |
| Service layer / use case | One place per user action that coordinates the work | Application layer |
| Adapter (port) | Swap an outside service (payments, email, AI model) without touching logic | Integrations |
| Dependency injection | Pass collaborators in instead of creating them; enables tests and swapping | Composition root at startup |
| Strategy | Choose between interchangeable algorithms at runtime | Pricing rules, export formats |
| Factory | Build complex objects in one place | Domain objects with invariants |
| Observer / publish-subscribe | Notify many parts of an event without coupling them | UI state, domain events |
| Retry with exponential backoff and jitter | Survive brief outages of outside services | HTTP clients, queues |
| Circuit breaker | Stop calling a failing dependency so the whole app does not hang | Calls to outside services |
| Idempotency key | Make "do it again" safe (double clicks, retries) | Payments, order creation, webhooks |
| Transactional outbox | Save data and publish an event reliably together | Event-driven systems |
| Saga | Multi-step workflows across services with compensating steps | Microservices only |
| Cache-aside | Read from cache first, fall back to the database, then fill the cache | Hot read paths |

Say why each pattern in TECH-SPEC.md is needed. A pattern with no named problem is removed. For any other pattern, including the 22 classic code patterns and the large-scale system patterns, read its row in [patterns.md](patterns.md).

## 3. Handling heavy load: the scale toolkit, in the order to reach for it

Ask for the expected load first (questions.md, phase 7b). Then pick the tier and apply only that tier's techniques. Each technique becomes part of an NFR with a number, and a load test proves it.

| Tier | Rough load | What is usually enough |
| --- | --- | --- |
| 0 | Personal or internal, under 100 users | One server or serverless, one database, backups. Nothing else |
| 1 | Thousands of users, under 50 requests/s | Stateless app, managed database with indexes, connection pooling, a CDN for static files, basic caching, monitoring and alerts |
| 2 | Hundreds of thousands of users, hundreds of requests/s | Several app instances behind a load balancer (horizontal scaling), database read replicas, a cache (for example Redis), queues and background workers for slow work, rate limiting, autoscaling, load tests in CI |
| 3 | Millions of users, thousands of requests/s or more | Data partitioning or sharding, multi-region deployment, event-driven parts, separate read models, chaos and failover testing, an error budget for the SLOs |

The techniques, in plain words:

- **Stateless servers plus a load balancer:** any server can answer any request, so you add servers when traffic grows (horizontal scaling). Sessions live in a shared store or token, never in one server's memory.
- **CDN:** static files and cacheable pages are served from servers near the user.
- **Caching:** keep frequent answers in fast memory. Every cache needs an expiry (TTL) and a rule for when it is cleared.
- **Database first aid,** before anything fancier: indexes for every frequent query, connection pooling, removing N+1 queries, pagination.
- **Read replicas:** copies of the database that serve reads, while one primary takes writes.
- **Queues and background workers:** slow or spiky work (emails, reports, AI calls) goes to a queue, so the user does not wait and peaks are smoothed.
- **Rate limiting and backpressure:** cap requests per user or key, so one client or an attack cannot take the system down.
- **Timeouts, retries and circuit breakers:** every outside call has a timeout, and failures degrade gracefully instead of cascading.
- **Partitioning or sharding:** split data by key (customer, region) when one database cannot hold or serve it all.
- **Observability:** logs, metrics and traces, with alerts on SLOs such as "99% of requests under 300 ms". You cannot scale what you cannot see.
- **Load testing:** a script (for example k6) that proves the NFR numbers before launch and after big changes.

At tier 2 or 3, [big-systems.md](big-systems.md) shows how Meta, WhatsApp, YouTube, Netflix, X, Discord, Telegram, Uber, Amazon and Shopify applied these techniques, and which patterns each is known for. Use it to explain a technique with a real example, never as the target design.

## 4. Turning the choice into enforced rules

After the owner chooses, the architect agent:

1. Writes the style, patterns and scale plan into TECH-SPEC.md, under the sections "Architecture style", "Design patterns" and "Scalability and load".
2. Writes an ADR, `docs/decisions/0002-architecture.md`, with the options, the choice, why, and when to revisit.
3. Writes `.claude/rules/architecture.md`, scoped to the source folders, stating the dependency rule in one or two lines. For example: "domain/ imports nothing from adapters/ or frameworks; adapters depend on domain ports".
4. Adds a **fitness function** to roadmap step 1: an automated check that fails when code breaks the dependency rule. For example dependency-cruiser or eslint-plugin-boundaries for TypeScript, or import-linter for Python, wired into `checks.full`. Where a load target exists, it also adds a load-test script to the roadmap step that delivers the feature.
