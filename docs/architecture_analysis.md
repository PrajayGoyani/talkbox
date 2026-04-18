# Architectural Analysis & Scalability Report

This report evaluates the current state of the project's architecture, pinpointing strengths and critical bottlenecks for scaling from a prototype to a large-scale production system.

## 🏗️ Current Architecture Overview

The system is a real-time messaging platform built with a modern stack:

- **Frontend**: Svelte 5 with atomic components and state management.
- **Backend**: Node.js/Express with Socket.io for bi-directional communication.
- **Data Persistence**: MongoDB (Mongoose ODM).
- **Control Flow**: Controller-Service-Model architecture.

---

## 🚀 Scalability Assessment

### 1. Backend: Horizontal Scaling (Stateful vs Stateless)

> [!CAUTION]
> **Status: Not Scalable**
> The current backend is **stateful**. Horizontal scaling (adding more server instances behind a load balancer) will fail because:
>
> - **In-Memory Maps**: `socketService.activeConnections` is stored in a local `Map`. If User A is on Server 1 and User B is on Server 2, they cannot communicate because Server 1 doesn't know about User B's socket.
> - **Lockdown Hash**: `chatLockdownService.deletedChats` is an in-memory `Set`. Synchronizing deleted chats across multiple instances is currently impossible.
> - **Solution**: Use **Redis** for socket state (Socket.io Redis Adapter) and distributed caching/state for the Lockdown service.

### 2. Real-time Presence & Notifications

> [!IMPORTANT]
> **Status: Partially Scalable**
>
> - **Current Pattern**: `notifyStatusChange` and `emitPartnersStatus` perform multiple DB queries (`ChatModel.find`) and then iterate through partners.
> - **Bottleneck**: As the number of active chats per user grows, the number of database lookups on every connect/disconnect event will increase linearly.
> - **Solution**: Implement a **Presence Cache** in Redis and use a Pub/Sub model for status updates to avoid repeated DB scans.

### 3. Database: Write Loads & Pruning

> [!TIP]
> **Status: Scalable with Optimization**
>
> - **Pruning Logic**: The 30-day retention policy uses `MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } })`.
> - **Bottleneck**: On a collection with millions of records, `deleteMany` is an expensive operation that can cause high CPU usage and lock shards.
> - **Solution**: Implement **Time-Series Partitioning** (using MongoDB's native time-series or manual monthly collections). Purging data then becomes a simple `DROP COLLECTION` or `DROP PARTITION` operation (O(1)).

### 4. Background Jobs

> [!NOTE]
> **Status: Needs Improvement**
>
> - **Current Pattern**: Using `setInterval` within the main application process.
> - **Concern**: Jobs run on all instances simultaneously if scaled horizontally, leading to redundant work and potential race conditions during cleanup.
> - **Solution**: Use a dedicated worker service (e.g., **BullMQ**, **Agenda**) to ensure jobs are processed exactly once and are decoupled from the API's memory/CPU.

---

## 🛠️ Recommended Scalability Roadmap

| Component           | Current State | Recommendation                     | Priority    |
| :------------------ | :------------ | :--------------------------------- | :---------- |
| **Messaging State** | Local `Map`   | **Redis Adapter** for Socket.io    | 🔴 Critical |
| **Presence Logic**  | DB-Driven     | **Redis Pub/Sub** + Presence Store | 🟠 High     |
| **Data Pruning**    | `deleteMany`  | **Monthly Partitioning**           | 🟡 Medium   |
| **Job Scheduling**  | `setInterval` | **BullMQ / Cron Service**          | 🟡 Medium   |

## Conclusion

The architecture is well-structured for a single-node deployment (up to ~1,000–5,000 concurrent users depending on hardware). However, to scale beyond that or to achieve High Availability (HA), the transition to a **stateless architecture** powered by Redis is mandatory.
