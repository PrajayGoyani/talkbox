<!-- Generated: 2026-04-20 | Files scanned: ~10 | Token estimate: ~600 -->
# Data Architecture

## Database Models (MongoDB/Mongoose)

### User
- Core fields: `username` (unique), `email` (unique), `password`, `name`, `avatar_url`, `lastSeen`.
- Virtuals: `avatarUrl` (resolves Cloudinary or UI-Avatars).
- Helpers: `findByEmailOrUsername`.

### Chat
- Relationships: `userA`, `userB`, `createdBy` (refs to User).
- Presence: `status` (pending | accepted | rejected).
- Metadata: `lastMessage`, `unreadCounts` (Map), `isDeleted`.
- Unique constraint: Ensures only one chat exists between any two users.

### Message
- Relationships: `chatId` (ref to Chat), `senderId` (ref to User).
- Content: `contentBody`, `attachment` (kind: image/audio/video, url).
- Logic: `isDeleted`, `idempotencyKey` (unique), `reactions` (emoji + user list).

### Notification
- Flow: `recipientId`, `senderId` (refs to User).
- Context: `type`, `referenceId` (points to chat/message), `message`.
- State: `isRead`.

## Key Indexes
- **Messages**: `{ chatId: 1, _id: -1 }` (Optimized for fetching conversation history).
- **Chats**: `{ userA/B: 1, isDeleted: 1, status: 1 }` (Optimized for user's chat list).
- **Notifications**: `{ recipientId: 1, createdAt: -1 }`, `{ recipientId: 1, isRead: 1 }` (Optimized for inbox and unread count).
- **Users**: Unique indexes on `username` and `email`.

## Relationships
- **Chat <-> Message**: 1-to-Many.
- **User <-> Chat**: 1-to-Many (as either userA or userB).
- **User <-> Notification**: 1-to-Many (as recipient).
