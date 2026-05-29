# MongoDB → PostgreSQL Migration: Deep Analysis & Refined Plan

## Executive Summary

After auditing the actual codebase (5 models, 6 repositories, 16 services, 4 background jobs), the original migration analysis is **directionally correct but underestimates complexity** in several critical areas. This document refines the plan with concrete findings.

---

## 1. Codebase Audit — Current MongoDB Surface Area

### Models (5 files)

| Model                                                                                                                           | Mongoose-Specific Features                                                                                                              | Migration Complexity                                        |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [User](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/models/user.model.ts)                 | Virtuals (`avatarUrl`), methods (`comparePassword`, `hashPassword`), statics (`findByEmailOrUsername`), pre-save hooks, `select: false` | 🔴 **High** — ORM must replicate virtuals + lifecycle hooks |
| [Chat](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/models/chat.model.ts)                 | `Map<string, number>` for unreadCounts, embedded `lastMessage` object, array of ObjectId refs, 4 compound indexes                       | 🔴 **High** — Map type + denormalization patterns           |
| [Message](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/models/message.model.ts)           | Embedded reactions array with nested user arrays, `unique: true` on idempotencyKey                                                      | 🟡 **Medium** — Reactions need junction table or JSONB      |
| [Notification](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/models/notification.model.ts) | Simple refs, polymorphic `referenceId`                                                                                                  | 🟢 **Low** — Near 1:1 mapping                               |
| [Quote](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/models/quote.model.ts)               | Simple flat structure, enum category                                                                                                    | 🟢 **Low** — Trivial migration                              |

### Repositories (6 files)

| Repository                                                                                                                                           | Mongoose Features Used                                                                                                                  | Rewrite Effort                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [ChatQueryRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/chat-query.repository.ts)      | **Complex aggregation pipeline** (search), `$lookup` (JOIN equivalent), `$objectToArray` on Map, `.populate()`, cursor-based pagination | 🔴 **High** — The `searchChats` aggregation is 90+ lines |
| [ChatRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/chat.repository.ts)                 | `findOneAndUpdate`, Map key access (`unreadCounts.${userId}`), cursor encoding                                                          | 🟡 **Medium**                                            |
| [MessageRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/message.repository.ts)           | Standard CRUD, `$set` operations                                                                                                        | 🟢 **Low**                                               |
| [NotificationRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/notification.repository.ts) | `.populate()` for sender info                                                                                                           | 🟢 **Low**                                               |
| [PartnerRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/partner.repository.ts)           | Thin wrapper                                                                                                                            | 🟢 **Low**                                               |
| [UserRepository](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/repositories/user.repository.ts)                 | Standard CRUD                                                                                                                           | 🟢 **Low**                                               |

### Critical Dependencies the Original Analysis Missed

> [!CAUTION]
> **Agenda Job Scheduler** — The app uses [Agenda](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/config/agenda.ts) (`@agendajs/mongo-backend`) which stores its job collection **directly in MongoDB**. Agenda has **no PostgreSQL backend**. This means:
>
> - Even after migrating all app data, you'd need MongoDB running just for job scheduling
> - OR you must replace Agenda entirely (e.g., with `pg-boss`, `bullmq`, or `graphile-worker`)

> [!WARNING]
> **MongoDB Transactions** — There is exactly [one transaction](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/services/chat/message.service.ts#L221-L261) in `persistMessageAndNotifyChat()` that atomically creates a message + updates the chat. This currently requires a MongoDB replica set. In PostgreSQL, this becomes native and simpler — but the migration path must handle this carefully.

> [!WARNING]
> **Background Jobs Access Models Directly** — Both [retention.handler.ts](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/jobs/handlers/retention.handler.ts) and [subscription.handler.ts](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/jobs/handlers/subscription.handler.ts) bypass the repository layer and use Mongoose models directly with `.cursor()`, aggregation pipelines, and `Types.ObjectId.createFromTime()`. These are **tightly coupled to MongoDB**.

---

## 2. What the Original Analysis Got Right ✅

1. **Relational fit** — Chat is inherently relational (Users ↔ Chats ↔ Messages). The `chat_participants` junction table is the correct normalization.
2. **unreadCounts improvement** — Moving `Map<string, number>` to an `unread_count` column on `chat_participants` is a significant architectural win (concurrent-safe atomic increments vs Map key mutation).
3. **Referential integrity** — The codebase currently has manual checks like `if (!chat)` everywhere. FK constraints eliminate entire categories of orphan data bugs.
4. **ACID advantages** — The single transaction in `MessageService` would become trivially native in PostgreSQL.

## 3. What the Original Analysis Got Wrong or Understated ❌

### 3.1 Underestimated: Repository Layer Rewrite

The original plan says "rewrite `src/models` and database access layers." In reality, **6 repository files + 4 background job handlers** need rewriting. The `ChatQueryRepository.searchChats()` alone is a 90-line aggregation pipeline that translates to a complex SQL query with:

- `JOIN` on `users` table (replaces `$lookup`)
- `WHERE ... NOT EXISTS` or `JOIN` filtering for "other participant"
- Cursor-based pagination with composite sort keys
- Dynamic unread count extraction (currently `$objectToArray` on the Map)

### 3.2 Missed: Agenda Replacement

Agenda is MongoDB-native. Alternatives for PostgreSQL:

| Tool              | Type              | Pros                              | Cons                                   |
| ----------------- | ----------------- | --------------------------------- | -------------------------------------- |
| `pg-boss`         | PostgreSQL-native | Zero extra infra, LISTEN/NOTIFY   | Less battle-tested than BullMQ         |
| `graphile-worker` | PostgreSQL-native | Excellent performance, maintained | Smaller community                      |
| `bullmq` + Redis  | Redis-backed      | Most mature, rich features        | Already have Redis; adds no PG benefit |

**Recommendation**: `pg-boss` — eliminates MongoDB entirely. No extra infrastructure since you'd already have PostgreSQL.

### 3.3 Missed: Mapper Layer Impact

The [mappers.ts](file:///home/dev/Documents/work/other/projects/talkbox/workspaces/apps/backend/src/utils/mappers.ts) utility uses Mongoose-specific patterns:

- `m.toObject()` — Mongoose document → plain object conversion
- `chat.unreadCounts?.get?.()` — Map accessor
- `(otherUser as unknown as ObjectId).toString()` — ObjectId type handling

All DTO mappers need updating — they're the boundary between your DB layer and your API.

### 3.4 Underestimated: Test Suite Impact

The architecture has **~276 test nodes** in the services community. Tests mock Mongoose models, use `ObjectId` constructors, and rely on Mongoose query chain behavior (`.select().lean().cursor()`). The test rewrite is **proportional to the repository rewrite** — roughly 50% of total effort.

---

## 4. Strategic Options

### Option A: Stay with MongoDB (Optimize Current)

**Effort**: Low (ongoing) | **Risk**: Low | **Timeline**: N/A

- Fix the `unreadCounts` Map → denormalized `chat_participants` collection (still in MongoDB)
- Add proper Change Streams for real-time sync if needed
- MongoDB is not holding you back at current scale

**When this is right**: You're not hitting pain points, and engineering time is better spent on features.

### Option B: Full Migration to PostgreSQL + Drizzle

**Effort**: 🔴 High (3–5 weeks solo) | **Risk**: Medium | **Timeline**: Phased over 6–8 weeks

The "correct" long-term architecture. Eliminates MongoDB entirely.

### Option C: Hybrid — PostgreSQL for Data, Keep Redis for Jobs

**Effort**: 🟡 Medium (2–3 weeks) | **Risk**: Medium-Low | **Timeline**: Phased over 4–5 weeks

Migrate data to PostgreSQL but use BullMQ (already have Redis) for job scheduling instead of Agenda. This avoids the pg-boss learning curve.

---

## 5. Recommended Approach: Option B (Full Migration)

> [!IMPORTANT]
> **Only proceed if**: (a) You plan to scale beyond current user base, (b) You're adding features that benefit from relational queries (group chats, search, analytics), or (c) The `unreadCounts` Map pattern is causing concurrency bugs.

### ORM Decision: Drizzle ORM

| Criteria              | Prisma                                | Drizzle                             |
| --------------------- | ------------------------------------- | ----------------------------------- |
| **Type Safety**       | Excellent (generated types)           | Excellent (schema-as-code)          |
| **Raw SQL Control**   | Limited (escape hatch needed)         | Native — SQL-like syntax            |
| **Performance**       | Query engine overhead (Rust binary)   | Zero overhead — compiles to SQL     |
| **Bun Compatibility** | Works but slower cold starts          | First-class Bun support             |
| **Migration Tooling** | `prisma migrate` (mature)             | `drizzle-kit` (good, improving)     |
| **Complex Queries**   | Requires `$queryRaw` for aggregations | Native subqueries, window functions |
| **Bundle Size**       | Heavy (~15MB engine)                  | Lightweight (~50KB)                 |

**Winner: Drizzle** — aligns with project's "performance-first" Bun runtime philosophy and gives you the SQL control needed for the complex `searchChats` query.

### ID Strategy: ULID

The original analysis mentions UUIDv4 or ULID. **ULID is strongly recommended** because:

- Sortable by creation time (critical for message ordering — replaces MongoDB's `ObjectId` timestamp trick used in `retention.handler.ts`)
- Compatible with `ORDER BY id` without a separate `createdAt` index
- Works with cursor-based pagination
- 128-bit like UUID, but lexicographically sortable

---

## 6. Proposed PostgreSQL Schema

```sql
-- Users
CREATE TABLE users (
  id       TEXT PRIMARY KEY,  -- ULID
  username TEXT NOT NULL UNIQUE,
  name     TEXT,
  email    TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  avatar_url TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  plan     TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  subscription_expires_at TIMESTAMPTZ,
  is_email_verified BOOLEAN DEFAULT false,
  bio      TEXT CHECK (char_length(bio) <= 200),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_plan_sub ON users (plan, subscription_expires_at);

-- Chats
CREATE TABLE chats (
  id         TEXT PRIMARY KEY,  -- ULID
  is_group   BOOLEAN DEFAULT false,
  created_by TEXT NOT NULL REFERENCES users(id),
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  last_message_id TEXT,  -- FK added after messages table
  last_message_body TEXT,
  last_message_sender TEXT,
  last_message_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  is_free_tier_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_chats_deleted ON chats (is_deleted, deleted_at) WHERE is_deleted = true;
CREATE INDEX idx_chats_free_tier ON chats (is_free_tier_only, is_deleted);

-- Chat Participants (junction table — replaces participants array + unreadCounts Map)
CREATE TABLE chat_participants (
  chat_id      TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  unread_count INTEGER DEFAULT 0,
  PRIMARY KEY (chat_id, user_id)
);
CREATE INDEX idx_cp_user ON chat_participants (user_id, chat_id);

-- Messages
CREATE TABLE messages (
  id              TEXT PRIMARY KEY,  -- ULID
  chat_id         TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id),
  content_body    TEXT DEFAULT '',
  attachment_kind TEXT CHECK (attachment_kind IN ('image', 'audio', 'video')),
  attachment_url  TEXT,
  is_deleted      BOOLEAN DEFAULT false,
  deleted_at      TIMESTAMPTZ,
  is_edited       BOOLEAN DEFAULT false,
  edited_at       TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_messages_chat ON messages (chat_id, id DESC);
ALTER TABLE chats ADD CONSTRAINT fk_last_message
  FOREIGN KEY (last_message_id) REFERENCES messages(id);

-- Message Reactions (normalized — replaces embedded array)
CREATE TABLE message_reactions (
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  slug       TEXT DEFAULT '',
  PRIMARY KEY (message_id, user_id, emoji)
);

-- Notifications
CREATE TABLE notifications (
  id           TEXT PRIMARY KEY,  -- ULID
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('chat_request', 'request_accepted', 'request_rejected', 'new_message')),
  reference_id TEXT NOT NULL,
  message      TEXT DEFAULT '',
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_notif_user ON notifications (recipient_id, created_at DESC);
CREATE INDEX idx_notif_read ON notifications (recipient_id, is_read);

-- Quotes
CREATE TABLE quotes (
  id       TEXT PRIMARY KEY,  -- ULID
  text     TEXT NOT NULL,
  author   TEXT,
  category TEXT DEFAULT 'motivation' CHECK (category IN ('motivation', 'tip', 'announcement')),
  active   BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_quotes_active ON quotes (active);
```

### Key Differences from Original Proposal

1. **ULID as TEXT** instead of UUID — sortable, no `createdAt` index needed for time-ordered queries
2. **Denormalized `last_message_*`** kept on `chats` table — matches current pattern, avoids expensive JOIN on chat listing
3. **Separate `message_reactions` table** — fully normalized, enables "find all users who reacted with 🔥" queries
4. **Partial indexes** — `WHERE is_deleted = true` matches MongoDB's partial filter expression pattern

---

## 7. Phased Migration Plan

### Phase 0: Pre-Migration Prep (Week 1)

- [ ] Set up PostgreSQL 16+ locally and in staging
- [ ] Install Drizzle ORM + drizzle-kit
- [ ] Create Drizzle schema mirroring the SQL above
- [ ] Generate initial migration
- [ ] Set up `pg-boss` as Agenda replacement

### Phase 1: Dual-Write Foundation (Week 2)

- [ ] Create new PostgreSQL repositories implementing same interfaces
- [ ] Add feature flag for DB backend selection (`USE_POSTGRES=true`)
- [ ] Migrate `Quote` and `Notification` first (simplest models)
- [ ] Update their repositories + mappers
- [ ] Run existing tests against PostgreSQL backend

### Phase 2: Core Data Migration (Weeks 3–4)

- [ ] Migrate `User` model (handle virtual `avatarUrl` as computed property)
- [ ] Migrate `Chat` model + create `chat_participants` junction table
- [ ] Migrate `Message` model + create `message_reactions` table
- [ ] Rewrite `ChatQueryRepository.searchChats()` as SQL query
- [ ] Rewrite `MessageService.persistMessageAndNotifyChat()` using PG transaction
- [ ] Write ETL script: MongoDB → PostgreSQL data migration

### Phase 3: Background Jobs (Week 5)

- [ ] Replace Agenda with `pg-boss`
- [ ] Rewrite `retention.handler.ts` using SQL bulk operations
- [ ] Rewrite `subscription.handler.ts` using SQL (replace `$lookup` aggregation with JOIN)
- [ ] Rewrite `presence-sync.handler.ts`

### Phase 4: Test Suite & Validation (Week 6)

- [ ] Update all unit tests to use Drizzle mocks
- [ ] Run full integration test suite
- [ ] Performance benchmarking (chat listing, message send, search)
- [ ] Load test the critical path: `saveAndDeliver`

### Phase 5: Data Migration & Cutover (Week 7–8)

- [ ] Run ETL on production data (during maintenance window)
- [ ] Verify data integrity (row counts, foreign key consistency)
- [ ] Switch feature flag
- [ ] Monitor for 48 hours
- [ ] Remove MongoDB code paths

---

## 8. Risk Matrix

| Risk                                   | Probability | Impact   | Mitigation                                                      |
| -------------------------------------- | ----------- | -------- | --------------------------------------------------------------- |
| Complex aggregation regression         | Medium      | High     | Write the `searchChats` SQL query first as a spike; benchmark   |
| Data loss during ETL                   | Low         | Critical | Dual-write period; rollback plan; checksums                     |
| Agenda replacement regression          | Medium      | Medium   | Implement `pg-boss` in parallel before removing Agenda          |
| Performance regression on chat listing | Medium      | High     | Benchmark `JOIN chat_participants` vs current denormalized read |
| Test suite breakage                    | High        | Medium   | Phase 4 dedicated to test migration                             |
| ULID ordering edge cases               | Low         | Low      | ULID is monotonic within same millisecond                       |

---

## Open Questions

> [!IMPORTANT]
>
> 1. **Are you currently running MongoDB as a replica set?** The existing transaction in `persistMessageAndNotifyChat` requires one. If not, you're already not getting transactional safety — this strengthens the case for PostgreSQL.

> [!IMPORTANT] 2. **What's your current production data volume?** (number of users, chats, messages). This determines ETL strategy — small datasets can do a simple dump-and-load; large datasets need streaming ETL with dual-write.

> [!IMPORTANT] 3. **Is there urgency?** If you're not hitting scaling pain or concurrency bugs with `unreadCounts`, Option A (stay + optimize) is the pragmatic choice. The migration ROI is highest when combined with a feature that benefits from relational queries (e.g., group chats, message search, admin dashboards).

> [!NOTE] 4. **Agenda attachment**: Are you satisfied with Agenda as a job scheduler, or would you welcome replacing it regardless of the DB migration? If you're already frustrated with Agenda, this migration doubles as a scheduler upgrade.

---

## Verification Plan

### Automated Tests

- Run `vp test` against all existing tests after each phase
- Add integration tests for PostgreSQL repositories
- Benchmark `saveAndDeliver` latency (target: ≤ current MongoDB latency)

### Manual Verification

- Verify chat listing, message pagination, search in staging
- Test concurrent message delivery (the `unreadCount` atomicity improvement)
- Validate retention job correctly identifies free-tier-only chats via SQL JOIN
