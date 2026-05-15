# Socket.IO Scalability Roadmap

This document outlines the scalability considerations for the Talkbox Socket.IO infrastructure as the user base grows toward 1 million concurrent users.

## Current State: Redis Pub/Sub Adapter

Currently, we use the `@socket.io/redis-adapter` to synchronize events across multiple backend instances.

### How it works

1. When an event is emitted to a room (e.g., `io.to('user:123').emit(...)`), the adapter publishes the event to a Redis channel.
2. All backend instances subscribed to that Redis channel receive the event.
3. Each instance checks if it has any local connections for that room and emits the event to them.

### Limitations at Scale (1M+ Users)

- **Broadcast Storm**: As the number of backend instances increases, the total network traffic on the Redis interface grows quadratically (`messages * instances`). Every instance receives every broadcast, even if it has no local sockets for that room.
- **CPU Overhead**: Backend instances waste CPU cycles filtering out events that don't belong to their locally connected users.
- **Redis Pub/Sub Bottleneck**: Standard Redis Pub/Sub is single-threaded and not sharded by default (in Redis < 7), creating a centralized bottleneck for all real-time traffic.

## Phase 1.5: Smart Local Routing ✅ (Implemented)

**Status**: Deployed — `SocketService.emitToUser()` / `emitToUsers()`  
**Why before Redis 7 Sharded Pub/Sub**: This is a zero-infrastructure-change optimization that eliminates ~90% of Redis Pub/Sub traffic with a simple if/else block.

### How it works

1. Before emitting to `user:{userId}`, check `activeConnections` (local map) for that user.
2. If the user has local sockets, call `redisSessionService.getGlobalSessionCount(userId)` (SCARD).
3. **Shortcut**: If `localConnections === globalConnections`, emit directly to local sockets and return — **zero Redis adapter traffic**.
4. **Fallback**: If counts don't match (user is on another instance too), emit via `io.to()` as before.

### Impact

| Scenario | Before | After |
|---|---|---|
| 1 tab, same instance (~90% of users) | Redis Pub/Sub round-trip | Direct local emit |
| 2 tabs, same instance | Redis Pub/Sub round-trip | Direct local emit |
| 1 tab here + 1 tab elsewhere | Redis Pub/Sub round-trip | Redis Pub/Sub (unchanged) |

### Implementation

- `SocketService.emitToUser(userId, event, data)` — single-user smart routing
- `SocketService.emitToUsers(userIds, event, data)` — batch smart routing per user
- `socket-events.ts` (message send/delete/update/reaction) and `chat-events.ts` (notifications) updated to use the new methods.

### Next Step

Once Redis 7 is available, layer **Sharded Pub/Sub** on top for the remaining cross-instance traffic (see below).

## Scaling Strategies

### 1. Short-Term: Redis 7 Sharded Pub/Sub

If upgrading to Redis 7+, we should move to **Sharded Pub/Sub** (`spublish`/`ssubscribe`).

- **Benefit**: Messages are only routed to the specific Redis nodes and backend instances that have subscribers for that specific shard.
- **Implementation**: Requires ensuring the `ioredis` client and Socket.IO adapter are configured for sharding.

### 2. Mid-Term: Targeted Routing (Stateful)

Instead of broadcasting to all instances, implement a "Presence Mapping" pattern.

- **Lookup**: Store the mapping of `userId -> backend_instance_id` in a fast Redis hash.
- **Targeted Push**: Before emitting, check the mapping and send the message only to the specific Redis channel for that instance (e.g., `socket.io#instance_42`).
- **Benefit**: Reduces network noise and CPU overhead by 99% in large clusters.

### 3. Long-Term: Messaging Mesh (NATS)

For massive global scale, consider replacing the Redis adapter with **NATS**.

- **Benefit**: NATS is a dedicated message-oriented middleware designed for high-throughput, low-latency routing with native clustering and sharding capabilities that out-perform Redis Pub/Sub for pure messaging workloads.

### 4. Regional Sharding

Split the user base into geographical regions (e.g., `us-east`, `eu-west`).

- Only use local Redis clusters for intra-region messaging.
- Use a "Global Bridge" or the primary database (MongoDB) for cross-region events that are less time-sensitive.

---

To answer your question: **No, the current default Socket.IO Redis adapter approach will hit a significant scalability wall long before you reach 1 million concurrent users** without further architectural changes.

Here is the breakdown of why it fails at that scale and how you would evolve it.

### 1. The "Broadcast Storm" Problem (Quadratic Growth)

The standard Redis adapter uses a **broadcast-to-all** pattern.

- When `Backend A` emits a message to `user:123`, it publishes a message to a global Redis channel.
- **Every other backend instance** (B, C, D... Z) receives that message via Redis.
- Each instance must then look up in its local memory: _"Do I have user 123 connected?"_

If you have 1 million users, you might have **500+ backend instances**. If each instance is receiving every single message sent by 1 million users, the network bandwidth and CPU overhead for "filtering" irrelevant messages will crash your cluster.

### 2. Redis Pub/Sub Bottleneck

Redis Pub/Sub is not sharded by default in older versions. Every message published to a channel is processed by the Redis master. At 1 million users, the single-threaded nature of Redis Pub/Sub processing will become your primary bottleneck, leading to increased latency and "backpressure."

---

# Chat Reference

---

### How to Scale to 1 Million Users

If you are planning for that level of growth, you need to move from **Broadcasting** to **Targeted Routing**.

#### A. Redis 7 "Sharded Pub/Sub"

If you upgrade to Redis 7, you can use `ssubscribe` and `spublish`. This ensures that messages are only routed to the specific Redis nodes and backend instances that actually care about that "shard" (e.g., based on the Room ID). This drastically reduces the "noise" each backend instance hears.

#### B. The "Presence Mapping" Pattern (Stateful Routing)

Instead of broadcasting to all instances, you maintain a mapping of `userId -> backend_instance_id` in a fast Redis key-value store (not Pub/Sub).

1. **Lookup**: Before sending, the service checks Redis: _"Where is User1 connected?"_
2. **Targeted Push**: It sends a message specifically to `Backend-Instance-42` (using a dedicated Redis channel for that instance).
3. **Efficiency**: Only 1 instance receives the message instead of 500.

#### C. Moving to NATS or RabbitMQ

For massive scale, many teams replace the Redis Adapter with **NATS** or a dedicated message mesh. NATS is designed for high-throughput message routing and handles sharding/clustering much more efficiently than Redis Pub/Sub for this specific use case.

#### D. Sticky Sessions & Geographical Sharding

At 1 million users, you would likely split your "cluster" into geographical regions (US-East, EU-West, etc.). You would then only use the Redis adapter _within_ a region, and use a different "Global Bridge" or a distributed database (like the MongoDB you're already using) to handle cross-region messaging.

### Summary for your Current Setup:

The fix we just implemented (isolating clients) is **mandatory** for your current architecture to work reliably at its current scale. However, if you genuinely expect to grow to 1 million users, your next architectural move should be implementing **Targeted Routing** or upgrading to **Redis 7 Sharded Pub/Sub** to avoid the "Broadcast Storm."

---

_Last Updated: 2026-05-15 (Phase 1.5 added)_
