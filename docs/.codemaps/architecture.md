<!-- Generated: 2026-05-08 | Files scanned: ~160 | Token estimate: ~900 -->
# Project Architecture

## System Overview
Real-time chat application with a Svelte frontend and a Bun-based Express backend. Uses Socket.io for bi-directional communication, MongoDB for persistent storage, and Redis for distributed state, pub/sub, and caching.

## Components
- **Frontend (Svelte 5)**: Client-side application using runes for state management and a custom hash router. Built with Vite Plus.
- **Backend (Bun/Express)**: REST API and WebSocket server handling authentication, chat orchestration, and notifications.
- **Shared (./shared)**: Shared types, Zod schemas, and utility functions used by both frontend and backend.
- **Storage (MongoDB)**: Primary data store for users, chats, messages, and notifications.
- **Cache & Pub/Sub (Redis)**: Distributed session management, presence tracking, and L2 cache for participants.
- **Media (Cloudinary)**: External service for avatar and media hosting.
- **Email (SMTP)**: Nodemailer-based service for password resets and verification.
- **Jobs (Agenda)**: Background task processing for data retention, email delivery, and account maintenance.

## Service Boundaries
- **AuthService**: Handles registration, login, JWT management, and account upgrades (Pro).
- **ChatService (Facade)**: High-level entry point delegating to specialized services:
  - `ChatActionService`: Orchestrates chat requests, accepts, rejects, and deletions.
  - `ChatListingService`: Handles paginated chat listings, pending requests, and search.
  - `MessageService`: Manages message history, read status, and plan-aware scrubbing.
- **SocketService**: Manages real-time message delivery, distributed session takeover, and event delegation to handlers.
- **PresenceService**: Tracks online status and broadcasts changes via Redis pub/sub.
- **NotificationService**: Handles persistent and real-time user alerts/notifications.
- **UserCacheService**: Manages L1 (local) and L2 (Redis) cache for user metadata.
- **UserService**: Core user profile management, avatar uploads, and username lookups.
- **EmailService**: Centralized SMTP handling for verification and recovery flows.
- **ImageService**: Cloudinary integration for secure media processing.
- **PolicyService**: Centralized business logic for plan-based restrictions (e.g., message limits).

## Data Flow
1. **Request**: HTTP REST (Auth, User, Chat History, Notifications).
2. **Real-time**: Socket.io (Messages, Typing, Presence, Notifications, Reactions).
3. **Synchronization**: Redis Pub/Sub for cross-instance communication (Presence, Cache Invalidation, Session Takeover).
4. **Storage**: Mongoose (ODM) -> MongoDB.
5. **Background**: Agenda triggers retention jobs, presence synchronization, and scheduled maintenance.


