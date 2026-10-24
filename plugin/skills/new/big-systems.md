# How the biggest systems are built

Purpose: short case studies of the highest-traffic systems, naming the architecture style and design patterns each one is known for, so the owner can see where a technique comes from and what problem it solved.
Read this when: the load tier is 2 or 3 (architecture.md section 3), the owner asks how a big company does something, or the architect needs an example for a pattern. Not for tier 0 or 1 projects.
Related files: architecture.md (styles and tiers), patterns.md (what each pattern means)

## Say this first

These companies grew into these designs over many years, with hundreds or thousands of engineers, after the simple version stopped working. Most of them started as one simple app: Twitter on Ruby on Rails, Instagram on Django, Shopify on Rails, which it still runs as a modular monolith. Copy the **problem → pattern** reasoning, not the end state. A new project starts with the tier its own numbers call for.

## The systems

Scale figures are what each company published at the time given; they have grown since. Pattern names are explained in [patterns.md](patterns.md).

| System | Scale (as published) | Architecture | Main patterns and techniques | Source |
| --- | --- | --- | --- | --- |
| **Meta (Facebook)** | Billions of cache reads per second (2013) | Large PHP/Hack application tier in front of sharded MySQL, with a huge cache tier between them | Cache-aside at scale (memcache), leases against cache stampedes, sharding, read replicas across regions, a graph data model served from cache (TAO) | [Scaling Memcache at Facebook](https://www.usenix.org/conference/nsdi13/technical-sessions/presentation/nishtala), [TAO](https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson) |
| **Instagram (Meta)** | Grew from zero to tens of millions of users with a very small team (2012) | Python/Django application, one of the largest Django deployments | Sharding PostgreSQL into thousands of logical shards mapped onto fewer physical servers, distributed ID generation (time + shard + sequence), caching | [Sharding & IDs at Instagram](https://medium.com/instagram-engineering/sharding-ids-at-instagram-1cf5a71e5a5c) |
| **WhatsApp (Meta)** | Over 2 million connections on one server (2012) | Erlang services on few, very large servers; a famously small engineering team | Actor model (one lightweight process per connection), store-and-forward (messages leave the server once delivered), end-to-end encryption, vertical scaling first | [1 million is so 2011](https://blog.whatsapp.com/1-million-is-so-2011) |
| **YouTube (Google)** | Video for billions of users | Services on Google's infrastructure; MySQL sharded by Vitess, which YouTube built | Sharding behind a proxy layer (Vitess), CDN and edge caching, background transcoding queues, adaptive bitrate streaming, custom video-encoding chips (2021) | [Vitess history](https://vitess.io/docs/overview/history/), [YouTube video infrastructure](https://blog.youtube/inside-youtube/new-era-video-infrastructure/) |
| **Netflix** | A large share of evening internet traffic in many countries | Hundreds of microservices on AWS, plus its own CDN | CDN inside internet providers' networks (Open Connect), microservices, API gateway, circuit breaker, chaos engineering (Chaos Monkey), caching, multi-region failover | [Open Connect](https://openconnect.netflix.com/), [Chaos Monkey](https://netflix.github.io/chaosmonkey/) |
| **X (Twitter)** | Hundreds of thousands of timeline reads per second (2013) | Moved from one Rails app to JVM microservices | Fan-out on write (each tweet copied into followers' cached timelines), fan-out on read for accounts with huge followings, distributed ID generation (Snowflake), caching | [Timelines at Scale](https://www.infoq.com/presentations/Twitter-Timeline-Scalability/), [recommendation code](https://github.com/twitter/the-algorithm) |
| **Discord** | Trillions of stored messages (2023); 5 million concurrent users on Elixir (2017) | Elixir services for real-time chat, Rust data services, ScyllaDB (formerly Cassandra) for messages | Actor model (one process per server/guild), publish-subscribe fan-out to online members, sharding messages by channel and time bucket, request coalescing in front of the database, consistent hashing | [How Discord stores trillions of messages](https://discord.com/blog/how-discord-stores-trillions-of-messages), [Scaling Elixir to 5M users](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) |
| **Telegram** | Hundreds of millions of users | Its own protocol (MTProto); several data centers in different regions, each user tied to a home data center | Sharding users by data center, its own binary protocol for speed on bad networks, server-side storage for cloud chats, channel fan-out | [MTProto](https://core.telegram.org/mtproto), [Data centers](https://core.telegram.org/api/datacenter) |
| **Uber** | Thousands of microservices (2020) | Grew from a monolith to thousands of microservices, then grouped them into domains (DOMA) to tame the complexity | Domain-oriented microservices, API gateway, geospatial indexing on a hexagon grid (H3), event streaming, sharding by city or region | [Domain-oriented microservices](https://www.uber.com/blog/microservice-architecture/), [H3](https://www.uber.com/blog/h3/) |
| **Amazon** | The largest online store; built the shopping-cart store for its peak days | Service-oriented: many services owned by small teams; AWS later grew out of these | Consistent hashing, replication with quorums, eventual consistency so the cart is always writable (Dynamo), cell-based isolation | [Dynamo paper](https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html) |
| **Shopify** | Among the highest checkout peaks on the web during Black Friday | **Modular monolith** in Rails, kept on purpose | Modular monolith with enforced boundaries, cell-based pods (each pod is a full copy of the stack serving a group of shops), sharding by shop | [Deconstructing the monolith](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity), [Pods](https://shopify.engineering/a-pods-architecture-to-allow-shopify-to-scale) |

## What they have in common

- **The database is the first wall.** Almost every system above split its data by a key (user, shop, channel, region) once one database could not keep up: sharding.
- **Caching everywhere,** with a plan for a cache miss under load (leases, request coalescing).
- **Slow work leaves the request path** through queues: transcoding, fan-out, notifications.
- **Failure is expected:** timeouts, circuit breakers, multi-region copies, and tests that break things on purpose.
- **Microservices followed team growth,** not the other way round. Shopify shows a monolith can run at the top tier; Uber shows the cost of too many services.

## How to use this in the interview

At tier 2 or 3, after proposing a style, name one or two rows above that faced the same problem, in one sentence each. For example: "Like Discord, your chat needs to send each message to many online people at once; that is publish-subscribe fan-out." Never present a row as the target design for a new project.
