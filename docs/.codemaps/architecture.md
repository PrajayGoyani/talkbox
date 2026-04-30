<!-- Generated: 2026-04-30 | Files scanned: ~150 | Token estimate: ~800 -->
# Project Architecture

## System Overview
Real-time chat application with a Svelte frontend and Express backend. Uses Socket.io for bi-directional communication, MongoDB for persistent storage, and Redis for distributed state, pub/sub, and caching.

## Components
- **Frontend (Svelte 5)**: Client-side application using runes for state management and a custom hash router. Built with Vite Plus.
- **Backend (Express/TS)**: REST API and WebSocket server handling authentication, chat orchestration, and notifications.
- **Storage (MongoDB)**: Primary data store for users, chats, messages, and notifications.
- **Cache & Pub/Sub (Redis)**: Distributed session management, presence tracking, and L2 cache for participants.
- **Media (Cloudinary)**: External service for avatar and media hosting.
- **Email (SMTP)**: Nodemailer-based service for password resets and verification.
- **Jobs (Agenda)**: Background task processing for data retention and account downgrades.

## Service Boundaries
- **AuthService**: Handles registration, login, JWT management, and account upgrades (Pro).
- **ChatService**: Orchestrates chat requests, deletions, and message history with plan-aware scrubbing.
- **SocketService**: Manages real-time message delivery, distributed session takeover, and event delegation.
- **PresenceService**: Tracks online status and broadcasts changes via Redis pub/sub.
- **ChatLockdownService**: Handles immediate message blocking for deleted/restricted chats.
- **NotificationService**: Handles persistent and real-time user alerts.
- **UserCacheService**: Managed L1 (local) and L2 (Redis) cache for user metadata.

## Data Flow
1. **Request**: HTTP REST (Auth, User, Chat History).
2. **Real-time**: Socket.io (Messages, Typing, Presence, Notifications).
3. **Synchronization**: Redis Pub/Sub for cross-instance communication (Presence, Cache Invalidation, Session Takeover).
4. **Storage**: Mongoose (ODM) -> MongoDB.
5. **Background**: Agenda triggers retention jobs and presence synchronization.

