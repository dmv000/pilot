# Design pattern catalogue

Purpose: one line per pattern on the problem it solves, when to use it and when not to, so patterns are chosen for a named problem and explained in plain words.
Read this when: the architect fills "Design patterns" in TECH-SPEC.md, the owner asks what a pattern is, or big-systems.md names a pattern. Read only the row you need.
Related files: architecture.md (section 2 lists the patterns most projects need), big-systems.md (who uses which pattern at scale)

A pattern goes into TECH-SPEC.md only with the problem it solves in this project. Code patterns link to [refactoring.guru](https://refactoring.guru/design-patterns/catalog) for diagrams and examples in many languages; the text here is a summary.

## A. Code patterns (the 22 classic "Gang of Four" patterns)

### Creational: how objects are made

| Pattern | Problem it solves | Use when | Avoid when |
| --- | --- | --- | --- |
| [Factory Method](https://refactoring.guru/design-patterns/factory-method) | Code must create objects without hard-coding their exact class | Subclasses or plugins decide which product to make | Only one product type exists |
| [Abstract Factory](https://refactoring.guru/design-patterns/abstract-factory) | Families of related objects must match (all dark-theme widgets, all AWS clients) | You switch whole families at once | There is one family |
| [Builder](https://refactoring.guru/design-patterns/builder) | Objects with many optional parts are hard to construct correctly | Constructors would take many parameters, or construction has steps | A plain object literal or named arguments are enough |
| [Prototype](https://refactoring.guru/design-patterns/prototype) | Copying a configured object is easier than building it again | Objects are expensive to set up and differ slightly | Objects are cheap to create |
| [Singleton](https://refactoring.guru/design-patterns/singleton) | Exactly one instance must exist (one config, one connection pool) | It is truly global and stateless or read-only | Almost always prefer passing the object in (dependency injection); singletons make testing hard |

### Structural: how pieces fit together

| Pattern | Problem it solves | Use when | Avoid when |
| --- | --- | --- | --- |
| [Adapter](https://refactoring.guru/design-patterns/adapter) | An outside API does not match the interface your code expects | Wrapping a payment, email or AI provider behind your own interface | You control both sides |
| [Bridge](https://refactoring.guru/design-patterns/bridge) | Two dimensions of variation would multiply subclasses (shape × renderer) | Both sides change independently | Only one dimension varies |
| [Composite](https://refactoring.guru/design-patterns/composite) | Trees of items must be treated the same as single items (folders and files, UI trees) | The data is a real tree | The structure is flat |
| [Decorator](https://refactoring.guru/design-patterns/decorator) | Add behavior (logging, caching, retries) around an object without changing it | Features stack in different combinations | A single fixed wrapper does the job |
| [Facade](https://refactoring.guru/design-patterns/facade) | A complex subsystem needs one simple entry point | Hiding a messy library or many services behind one module | The subsystem is already simple |
| [Flyweight](https://refactoring.guru/design-patterns/flyweight) | Millions of similar objects use too much memory | Shared, unchanging data can be split out (game tiles, glyphs) | Object counts are small |
| [Proxy](https://refactoring.guru/design-patterns/proxy) | Control access to an object: lazy loading, caching, permission checks, remote calls | The real object is expensive or remote | Direct access is fine |

### Behavioral: how pieces talk

| Pattern | Problem it solves | Use when | Avoid when |
| --- | --- | --- | --- |
| [Chain of Responsibility](https://refactoring.guru/design-patterns/chain-of-responsibility) | A request should pass through a series of handlers (middleware) | HTTP middleware, validation pipelines, approval chains | There is one handler |
| [Command](https://refactoring.guru/design-patterns/command) | Actions must be queued, logged, undone or retried | Undo/redo, job queues, audit logs | Calls are simple and immediate |
| [Iterator](https://refactoring.guru/design-patterns/iterator) | Walk a collection without exposing how it is stored | Custom collections, paginated APIs | The language's built-in iteration covers it |
| [Mediator](https://refactoring.guru/design-patterns/mediator) | Many components call each other directly and become tangled | Complex forms or dialogs, chat rooms | Two or three components talk |
| [Memento](https://refactoring.guru/design-patterns/memento) | Save and restore an object's state without exposing its internals | Undo, drafts, snapshots | State is trivial to copy |
| [Observer](https://refactoring.guru/design-patterns/observer) | Many parts must react to a change without being hard-wired | UI state, domain events (in-process publish-subscribe) | Only one listener exists |
| [State](https://refactoring.guru/design-patterns/state) | Behavior depends on a state, and `if`/`switch` blocks grow everywhere | Orders, workflows, connections with clear states | Two simple states |
| [Strategy](https://refactoring.guru/design-patterns/strategy) | Choose between interchangeable algorithms at runtime | Pricing rules, export formats, sort orders | Only one algorithm will ever exist |
| [Template Method](https://refactoring.guru/design-patterns/template-method) | Algorithms share steps but differ in a few | Import pipelines, report generators | Composition (Strategy) would be simpler |
| [Visitor](https://refactoring.guru/design-patterns/visitor) | Add operations over a fixed set of node types without changing them | Compilers, document trees, AST tools | The node types change often |

Also common in application code: **Repository**, **Service layer / use case**, **Dependency injection** (architecture.md section 2).

## B. System patterns (for load, data and failure)

| Pattern | In plain words | Use when | Cost |
| --- | --- | --- | --- |
| **Cache-aside** | Read the cache first; on a miss read the database and fill the cache | Hot data read far more often than written | Stale data; needs expiry and clearing rules |
| **Stampede protection** (leases, request coalescing) | When a popular item drops out of cache, only one request rebuilds it; the rest wait | Very hot keys under heavy load | More code in the cache layer |
| **CDN / edge caching** | Serve files and cacheable pages from servers near the user | Static assets, video, public pages | Purging is slower; cost per gigabyte |
| **Read replicas** | Copies of the database answer reads; one primary takes writes | Reads far outnumber writes | Replicas lag slightly behind |
| **Sharding / partitioning** | Split data across databases by a key (user, shop, region) | One database cannot hold or serve the data | Queries across shards are hard; resharding is a project |
| **Consistent hashing** | Map keys to servers so adding a server moves only a few keys | Caches and data stores that grow and shrink | Needs virtual nodes to spread load evenly |
| **Distributed IDs** (Snowflake-style) | Unique, roughly time-ordered IDs created without a central counter | Many writers, sharded data | Depends on clock sanity |
| **Message queue** | Put work on a queue; workers process it later | Slow or spiky work: emails, reports, video, AI calls | Eventual completion; needs retries and dead-letter handling |
| **Publish-subscribe** | One event is delivered to many interested consumers | Notifications, chat delivery, integrations | Harder to trace; consumers must be idempotent |
| **Fan-out on write / on read** | Pre-build each reader's feed when something is posted, or build it when read | Feeds and timelines; mix both for accounts with huge audiences | Write amplification, or slow reads |
| **Actor model** | Many small isolated processes, each owning its state and handling one message at a time | Huge numbers of concurrent connections or rooms (chat, games) | Different programming model; needs a runtime such as Erlang/Elixir or Akka |
| **Store-and-forward** | Hold a message until the recipient is online, then delete it | Messaging with offline users | Delivery tracking and storage limits |
| **CQRS** | Separate models for writing and for reading | Read and write loads or shapes differ a lot | Two models to keep in sync |
| **Event sourcing** | Store every change as an event; current state is derived | Strong audit needs, rebuildable history | High complexity; schema changes of events are hard |
| **Saga** | A multi-step process across services, with undo steps if one fails | Orders or bookings that span services | Complex failure paths |
| **Transactional outbox** | Save data and the event to publish in one database transaction; a relay publishes it | Reliable events from a database-backed service | An extra table and relay |
| **Idempotency key** | Repeating a request has no extra effect | Payments, order creation, webhooks, any retried call | Keys must be stored for a time |
| **Retry with backoff and jitter** | Retry failures with growing, randomized waits | Brief outages of outside services | Retries can amplify an outage without limits |
| **Circuit breaker** | Stop calling a failing dependency for a while | Any remote dependency | Needs a fallback behavior |
| **Bulkhead** | Separate resource pools so one failing part cannot drain them all | Mixed critical and non-critical calls | Less sharing of capacity |
| **Rate limiting and backpressure** | Cap requests per client; slow producers when consumers fall behind | Public APIs, queues, abuse protection | Legitimate bursts get rejected |
| **API gateway** | One entry point that routes, authenticates and limits calls to many services | Many services or client types | Another component to run; can become a bottleneck |
| **Service discovery** | Services find each other's current addresses automatically | Many instances that come and go | Infrastructure to run |
| **Cell-based architecture (pods)** | Run many full, independent copies of the stack, each serving a slice of customers | Limiting the blast radius of failures at very large scale | Routing layer; cross-cell work is hard |
| **Geospatial indexing** | Index locations in a grid (hexagons, geohash) to find nearby things fast | Maps, ride and delivery matching | Edge cases at cell borders |
| **Strangler fig** | Replace an old system piece by piece behind the same entry point | Migrating legacy code without a big-bang rewrite | Two systems run side by side for a while |
| **Chaos engineering** | Break things on purpose in a controlled way to prove recovery works | Tier 3 systems with failover | Needs good monitoring first |

More system patterns with diagrams: [Azure Architecture Center patterns](https://learn.microsoft.com/en-us/azure/architecture/patterns/), [microservices.io](https://microservices.io/patterns/).
