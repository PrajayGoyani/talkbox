# High-Level Functional & Technical Requirements

This document outlines the core functional requirements, API endpoints, socket events, and tech stack dependencies for the `user-chat` application.

## Core Features & User Stories

### 1. Messaging & Chat Listing

- **Dynamic Chat List**: Display active user chat list with receiver avatar, name, last message snippet, timestamp, and unread message count.
- **Real-Time Delivery**: Send and receive messages instantly via Socket.io.
- **History Retrieval**: Get chat messages and list of users in a conversation.

### 2. User & Authentication

- **User Management**: Support user registration, login, logout, and profile retrieval/updating.
- **Avatar Uploads**: Support uploading user profile pictures.
- **Security & Account Recovery**: Standard password reset, forget password flow, and OTP verification.

---

## API Reference Checklist

### 1. Auth APIs

- `POST` `/api/auth/register` - Register a new user account.
- `POST` `/api/auth/login` - Authenticate a user and return a token.
- `POST` `/api/auth/logout` - Invalidate active session token.
- `POST` `/api/auth/refresh` - Refresh active session.
- `POST` `/api/auth/verify` - Check current auth token status.
- `POST` `/api/auth/forget-password` - Trigger password recovery.
- `POST` `/api/auth/reset-password` - Set new password with recovery token.
- `POST` `/api/auth/verify-otp` - Verify one-time password.

### 2. User APIs

- `GET` `/api/user/profile` - Fetch current user profile.
- `PUT` `/api/user/profile` - Update profile details.
- `POST` `/api/user/upload-avatar` - Upload user profile avatar.

### 3. Chat APIs

- `GET` `/api/chat/list` - Fetch user's active chat list.
- `POST` `/api/chat/create` - Initiate a new chat conversation.
- `GET` `/api/chat/messages` - Retrieve message history for a chat.
- `GET` `/api/chat/users` - Fetch participants of a chat.

### 4. Message APIs

- `POST` `/api/message/send` - Send a message (fallback/HTTP).

### 5. Socket.io Events

- `new_message` - Listen for incoming messages in real-time.
- `new_chat` - Listen for newly created conversations.

---

## Technical Stack & Dependencies

### Native Node.js APIs Used

- `path`, `events`, `stream`, `cluster`, `crypto`, `fs`, `http`, `net`, `os`, `readline`, `tls`, `url`, `util`, `zlib`

### Primary NPM Packages

- `express` (HTTP Routing & Server)
- `mongoose` (MongoDB Object Modeling)
- `bcrypt` (Password Hashing)
- `jsonwebtoken` (JWT Authentication)
- `socket.io` (Real-time Bi-directional Communication)
- `multer` (File Upload handling)
- `dotenv` (Environment Configuration)
