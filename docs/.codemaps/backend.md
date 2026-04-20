<!-- Generated: 2026-04-20 | Files scanned: ~50 | Token estimate: ~800 -->
# Backend Architecture

## API Routes

### Auth (`/api/auth`)
- `POST /signup` -> `auth.controller.signup` (with `signupSchema` validation)
- `POST /login` -> `auth.controller.login` (with `loginSchema` validation)
- `POST /refresh` -> `auth.controller.refresh`
- `POST /logout` -> `auth.controller.logout`
- `GET  /me` -> `auth.controller.getMe` (Auth required)

### Chat (`/api/chat`)
- `GET  /` -> `chat.controller.getChatListing`
- `GET  /requests` -> `chat.controller.getChatRequests`
- `GET  /search` -> `chat.controller.searchChats`
- `POST /request` -> `chat.controller.requestChat` (Chat request validation)
- `PUT  /:chatId/accept` -> `chat.controller.acceptChat`
- `PUT  /:chatId/reject` -> `chat.controller.rejectChat`
- `DELETE /:chatId` -> `chat.controller.deleteChat`
- `GET  /:chatId/messages` -> `chat.controller.getChatMessages`
- `PUT  /:chatId/read` -> `chat.controller.markChatRead`

### User (`/api/user`)
- `POST /avatar` -> `user.controller.uploadAvatar` (Multer memory storage)
- `PATCH /profile` -> `user.controller.updateProfile`
- `GET  /search` -> `user.controller.searchByUsername`

### Notifications (`/api/notifications`)
- `GET  /` -> `notification.controller.getNotifications`
- `PUT  /read-all` -> `notification.controller.markAllAsRead`
- `PUT  /:id/read` -> `notification.controller.markAsRead`

## Middleware Chain
1. `authenticateToken`: Validates JWT in auth header.
2. `rateLimiter`: Limits request frequency.
3. `validate(schema)`: Validates body/params using Zod.

## Key Services
- `ChatService`: `backend/src/services/chat.service.ts`
- `SocketService`: `backend/src/services/socket.service.ts`
- `NotificationService`: `backend/src/services/notification.service.ts`
- `AuthService`: `backend/src/services/auth.service.ts`

## Sockets
- Namespace: Root (`/`)
- Authenticated via JWT handshake.
- Handlers: `handleConnection`, `handleTyping`, `saveAndDeliverMessage`.
- Security: User existence check on connection.
