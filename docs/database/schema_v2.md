# Database Schema Analysis & Proposed Changes

Analysis of the current schema identifies gaps in supporting modern chat features. This plan outlines the structural changes needed to enable Group Messaging, Message Lifecycle (Edit/Delete/Read), Media Sharing, E2EE, Global Search, Presence, and Rich Feedback.

## User Review Required

> [!IMPORTANT]
> **Schema Migration Strategy**: Changing the `Chat` model from `userA/userB` to a more participant-based system is a breaking change. We should decide whether to maintain the legacy fields or perform a full migration.

> [!WARNING]
> **Read Receipts in Groups**: Tracking read receipts for group chats (who read what) significantly increases database write volume. I propose starting with a `lastReadMessageId` per participant.

## Proposed Changes

### 1. Group Messaging & Participant System

We need to transition from a fixed 2-user schema to a flexible participant system.

#### [MODIFY] [chat.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/chat.model.js)

- Add `kind`: `enum: ["1:1", "group"]`.
- Add `participants`: Array of User IDs.
- Add `groupMetadata`:
  - `name`: string (required for groups).
  - `description`: string.
  - `avatarUrl`: string.
  - `admins`: Array of User IDs.
- Keep `userA/userB` for 1:1 legacy or replace them entirely with `participants[0]/participants[1]`.

### 2. Message Lifecycle (Edit/Delete/Read/Reply)

Uncommenting existing placeholders and adding new ones for rich interactivity.

#### [MODIFY] [message.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/message.model.js)

- **Uncomment**: `status`, `isEdited`, `editedAt`, `isDeleted`, `deletedAt`.
- **Add Replies**: `replyTo`: { type: Schema.Types.ObjectId, ref: 'Message', default: null }.
- **Add Reactions**: `reactions`: Map of `emoji -> [UserIDs]`.
- **Add Pinning**: `isPinned`: { type: Boolean, default: false }.
- **Add Search Index**: `messageSchema.index({ contentBody: "text" })`.

### 3. Media & File Sharing Enhancement

#### [MODIFY] [message.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/message.model.js)

- Expand `attachment`:
  - `kind`: Add "document", "file".
  - `filename`: string.
  - `size`: number.
  - `mimeType`: string.

### 4. End-to-End Encryption (E2EE) Infrastructure

#### [NEW] [keyBundle.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/keyBundle.model.js)

- `userId`: ref to User.
- `registrationId`: number.
- `identityKey`: public key string.
- `signedPreKey`: { id, key, signature }.
- `oneTimePreKeys`: Array of { id, key }.

#### [MODIFY] [message.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/message.model.js)

- Add `isEncrypted`: boolean.

### 5. Advanced Presence System

#### [MODIFY] [user.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/user.model.js)

- Add `presenceStatus`: `enum: ["online", "offline", "away", "dnd", "invisible"]`.
- `customStatus`: string (e.g., "In a meeting").

### 6. Validation Schema Updates

#### [MODIFY] [chat.schema.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/schemas/chat.schema.js)

- Update `createChatSchema` to handle both individual and group chat creation.
- Add validation for `groupMetadata` and `participants` array.

### 7. Notification Updates

#### [MODIFY] [notification.model.js](file:///home/dev/Documents/work/other/projects/talkbox/backend/src/models/notification.model.js)

- Add new notification types: `group_invite`, `group_message`, `message_reaction`.

## Open Questions

1. **Group Size Limits**: Should we enforce a maximum number of participants in a group at the schema level?
2. **Message Retention**: Do we need an `expiresAt` field for ephemeral messaging?
3. **Legacy Data**: Do you want to keep `userA`/`userB` in the `Chat` model for performance/simplicity in 1:1 chats, or move everything to a `participants` array?

## Verification Plan

### Automated Tests

- Mongoose validation tests for the new schema fields.
- Migration script tests to ensure 1:1 chats are correctly converted (if needed).

### Manual Verification

- Verify successful creation of group chats via MongoDB Shell/Compass.
- Test message editing/deletion states in the database.
