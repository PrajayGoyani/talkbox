<!-- Generated: 2026-05-08 | Files scanned: ~160 | Token estimate: ~850 -->

# Backend Architecture

## API Routes

### Auth (`/api/auth`)

- `POST /signup` -> `auth.controller.signup`
- `POST /login` -> `auth.controller.login`
- `POST /refresh` -> `auth.controller.refresh`
- `POST /logout` -> `auth.controller.logout`
- `GET  /me` -> `auth.controller.getMe`
- `POST /upgrade-pro` -> `auth.controller.upgradeToPro`
- `POST /forgot-password` -> `auth.controller.forgotPassword`
- `POST /reset-password` -> `auth.controller.resetPassword`
- `GET  /verify-email` -> `auth.controller.verifyEmail`
- `POST /resend-verification` -> `auth.controller.resendVerification`

### Chat (`/api/chat`)

- `GET  /` -> `chat.controller.getChatListing` (Cursor pagination)
- `GET  /requests` -> `chat.controller.getChatRequests`
- `GET  /search` -> `chat.controller.searchChats`
- `POST /request` -> `chat.controller.requestChat`
- `PUT  /:chatId/accept` -> `chat.controller.acceptChat`
- `PUT  /:chatId/reject` -> `chat.controller.rejectChat`
- `DELETE /:chatId` -> `chat.controller.deleteChat`
- `GET  /:chatId/messages` -> `chat.controller.getChatMessages` (Plan-aware scrubbing)
- `PUT  /:chatId/read` -> `chat.controller.markChatRead`

### User (`/api/user`)

- `POST /avatar` -> `user.controller.uploadAvatar`
- `PATCH /profile` -> `user.controller.updateProfile`
- `GET  /search` -> `user.controller.searchByUsername`

### Notifications (`/api/notifications`)

- `GET  /` -> `notification.controller.getNotifications`
- `PUT  /read-all` -> `notification.controller.markAllAsRead`
- `PUT  /:id/read` -> `notification.controller.markAsRead`

## Middleware Chain

1. `authenticateToken`: Validates JWT.
2. `rateLimiter`: Distributed (Redis) with L1 local block fallback ("Fail-through protection").
3. `validate(schema)` / `validateQuery(schema)`: Zod schema validation for body/query params.

## Key Services

- `ChatService`: Facade for chat orchestration, listing, and message history.
- `SocketService`: High-performance WebSocket management with L1/L2 participant/partner caching.
- `PresenceService`: Real-time status broadcasting via Redis pub/sub.
- `RedisService`: Centralized Redis operations (Idempotency, Presence Sync Queue, Session Management).
- `NotificationService`: Core logic for alert persistence and dispatch.

## Sockets

- Authenticated via JWT handshake.
- **Distributed Session Management**:
  - Free users: One active session (deterministic takeover).
  - Pro users: Up to 5 active sessions.
- **Handlers**:
  - `MessageHandler`: CRUD operations for messages (Save, Deliver, Edit, Delete) with idempotency.
  - `ReactionHandler`: Manage emoji reactions with slug normalization.
  - `TypingHandler`: Throttled typing indicators.
