# Infrastructure & Database Research Notes

_This document serves as the central brain trust for infrastructure decisions led by the CTO agent._

## Current Constraints

- 1,000 Total Users
- 100 Max Chats per User
- 30-Day Message Retention Policy
- Extremely Heavy Write Load (Chat metrics + System Logging)

## Core Questions

### 1. Database Selection (Heavy Writes)

- Which database engine best handles our high-ingest messaging load?
- **Options to evaluate**: PostgreSQL (Citus?), MongoDB, Cassandra/ScyllaDB.

### 2. CPU Architecture Constraints

- What specific CPU architectures (ARM64 vs x86) are best aligned with our chosen DB's operations?
- What are the I/O and context-switching bottlenecks for socket servers?

### 3. MongoDB Specifics

- **Atlas vs. Self-Hosted**: Cost comparisons, SLA guarantees, and backup management overhead.
- **Supported Indexes**: How do we map our query patterns to MongoDB's native indexing capabilities?

### 4. Indexing Structures

- **Hashed vs. B-Tree Indexes**: When to use exact match hashing (O(1)) vs range-queryable B-Trees (O(log n)).
- **Self-Balancing Tree Costs**: What is the actual CPU penalty of inserting into a B-Tree with 1 million records? Can we defer balancing?

### 5. Time-Ranged Auto Partitions

- How do we structure tables/collections to automatically partition data by month?
- **Goal**: Expand to a new partition dynamically when the time upper-bound is hit to make the 30-day retention purge an O(1) drop operation instead of a massive `DELETE` scan.
