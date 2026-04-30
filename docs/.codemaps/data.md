<!-- Generated: 2026-04-30 | Files scanned: ~20 | Token estimate: ~700 -->
# Data Architecture

## Database Models (MongoDB/Mongoose)

### User
- Core fields: `username` (unique), `email` (unique), `password`, `name`, `avatar_url`, `lastSeen`.
- Plan details: `plan` ("free" | "pro"), `subscriptionExpiresAt`.
- Flags: `isEmailVerified` (boolean).
- Profile: `bio` (max 200 chars).
- Virtuals: `avatarUrl` (resolves Cloudinary or UI-Avatars).

### Chat
- Relationships: `participants` (array of User refs), `createdBy` (ref to User).
- Legacy fields: `userA`, `userB` (for unique constraint/back-compat).
- Type: `isGroup` (boolean).
- Status: `status` (pending | accepted | rejected).
- Metadata: `lastMessage`, `unreadCounts` (Map), `isDeleted`, `isFreeTierOnly`.

### Message
- Relationships: `chatId` (ref to Chat), `senderId` (ref to User).
- Content: `contentBody`, `attachment` (kind: image/audio/video, url).
- Logic: `isDeleted`, `idempotencyKey` (unique), `reactions` (emoji + slug + user list).

### Notification
- Flow: `recipientId`, `senderId` (refs to User).
- Context: `type`, `referenceId` (points to chat/message), `message`.
- State: `isRead`.

## Key Indexes
- **Messages**: `{ chatId: 1, _id: -1 }` (Conversation history).
- **Chats**: 
  - `{ participants: 1, isDeleted: 1, status: 1, "lastMessage.sentAt": -1 }` (Super index for listing).
  - `{ userA: 1, userB: 1 }` (Unique constraint for 1-to-1).
  - `{ participants: 1, isFreeTierOnly: 1 }` (Upgrade sync).
- **Users**: 
  - Unique indexes on `username` and `email`.
  - `{ plan: 1, subscriptionExpiresAt: 1 }` (Retention/Downgrade job).

## Relationships
- **Chat <-> Message**: 1-to-Many.
- **User <-> Chat**: Many-to-Many (via `participants`).
- **User <-> Notification**: 1-to-Many (as recipient).

