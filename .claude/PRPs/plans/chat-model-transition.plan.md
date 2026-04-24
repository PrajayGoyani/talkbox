# Plan: Transition to Participants Array and Group Support

## Summary
Transition the `Chat` model from a fixed `userA`/`userB` structure to a flexible `participants` array. This enables future group chat support, simplifies indexing for multi-user scenarios, and removes the "ordering hack" currently used to enforce uniqueness in 1-to-1 chats.

## User Story
As a developer, I want a flexible chat structure so that I can support group chats and have a more scalable database schema.

## Problem → Solution
`userA`/`userB` fixed fields (Rigid, 1-to-1 only) → `participants: string[]` + `isGroup` (Flexible, n-participants support).

## Metadata
- **Complexity**: Large
- **Source PRD**: N/A
- **PRD Phase**: standalone
- **Estimated Files**: 12

---

## UX Design
N/A — internal database and service layer change. The frontend `ChatDto` already abstracts some of this (via `otherUser`), but `participants` will be added to the DTO.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `backend/src/models/chat.model.ts` | all | Core schema to modify |
| P0 | `backend/src/services/chat.service.ts` | 55-107, 404-424 | Core logic to refactor |
| P1 | `backend/src/services/socket.service.ts` | 170-209 | Partner ID lookup logic |
| P2 | `backend/src/types/chat.types.ts` | all | DTO structure |

---

## Patterns to Mirror

### SCHEMA_DEFINITION
// SOURCE: backend/src/models/chat.model.ts:21-43
```typescript
const chatSchema = new Schema<IChat>({
  userA: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  userB: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  // ...
});
```

### ERROR_HANDLING
// SOURCE: backend/src/utils/AppError.ts:26-56
```typescript
throw AppError.badRequest("A chat request is already pending", "CHAT_ALREADY_PENDING");
```

### SERVICE_METHOD_QUERY
// SOURCE: backend/src/services/chat.service.ts:119-123
```typescript
const query: any = {
  $or: [{ userA: userId }, { userB: userId }],
  isDeleted: false,
  status: "accepted",
};
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `backend/src/models/chat.model.ts` | UPDATE | Update schema to include `participants` and `isGroup`. |
| `backend/src/services/chat.service.ts` | UPDATE | Refactor all `userA`/`userB` logic to use `participants`. |
| `backend/src/services/socket.service.ts` | UPDATE | Update `_getPartnerIds` to handle array. |
| `backend/src/services/socket-handlers/message.handler.ts` | UPDATE | Ensure delivery to all participants. |
| `backend/src/services/socket-handlers/typing.handler.ts` | UPDATE | Ensure typing emits to all participants. |
| `backend/src/services/socket-handlers/reaction.handler.ts` | UPDATE | Ensure reaction emits to all participants. |
| `backend/src/types/chat.types.ts` | UPDATE | Add `participants` and `isGroup` to `ChatDto`. |
| `backend/src/scripts/migrate-participants.ts` | NEW | Run-once migration script helper. |

---

## NOT Building
- Group creation UI or logic (only enabling the structural support).
- Actually enabling 2+ participants in `requestChat` yet (staying 1-to-1 but using the new structure).

---

## Step-by-Step Tasks

### Task 1: Update Chat Model
- **ACTION**: Modify `IChat` and `chatSchema`.
- **IMPLEMENT**: Add `participants` and `isGroup`. Keep `userA`/`userB` as optional for backward compatibility during migration.
- **MIRROR**: Follow existing `ObjectId` ref patterns.
- **IMPORTS**: `@models/user.model`
- **VALIDATE**: `vp fmt --check`

### Task 2: Implement Migration Script
- **ACTION**: Create `backend/src/scripts/migrate-participants.ts`.
- **IMPLEMENT**: Script that iterates through all chats and sets `participants = [userA, userB]` if `participants` is missing.
- **VALIDATE**: Run against a local dev database.

### Task 3: Refactor ChatService - Creation
- **ACTION**: Update `requestChat`.
- **IMPLEMENT**: Instead of sorting `userA`/`userB` and storing them, sort the 2 IDs and store them in `participants`.
- **MIRROR**: Use `new ObjectId(id).getTimestamp()` for deterministic sorting if needed, or just alphabetical string sort.
- **VALIDATE**: `vp test backend/src/services/__tests__/chat.service.test.ts`

### Task 4: Refactor ChatService - Lookups
- **ACTION**: Update `getChatListing`, `getChatRequests`, and `_transformChat`.
- **IMPLEMENT**: Change `$or` queries to `{ participants: userId }`.
- **VALIDATE**: Ensure pagination still works.

### Task 5: Refactor SocketService & Handlers
- **ACTION**: Update `_getPartnerIds` and all emits.
- **IMPLEMENT**: Emits should target all members of `participants` except sender.
- **VALIDATE**: Real-time message delivery in manual testing.

---

## Testing Strategy
1.  **Migration Test**: Verify existing chats correctly map to `participants` array.
2.  **1-to-1 Regression**: Ensure standard chat requests still work.
3.  **Unique Constraint**: Verify that creating a duplicate chat (even if IDs are swapped) still fails.

## Validation Commands
```bash
vp test backend/src/services/__tests__/chat.service.test.ts
vp fmt
```

## Acceptance Criteria
- [ ] Schema contains `participants` and `isGroup`.
- [ ] No more `$or: [{ userA }, { userB }]` queries in code.
- [ ] Existing 1-to-1 functionality is 100% preserved.
- [ ] Unit tests pass.
