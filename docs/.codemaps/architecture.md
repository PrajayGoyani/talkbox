<!-- Generated: 2026-04-20 | Files scanned: ~50 | Token estimate: ~600 -->
# Project Architecture

## System Overview
Real-time chat application with a Svelte frontend and Express backend. Uses Socket.io for bi-directional communication and MongoDB for persistent storage.

## Components
- **Frontend (Svelte 5)**: Client-side application using runes for state management and a custom hash router.
- **Backend (Express/TS)**: REST API and WebSocket server handling authentication, chat orchestration, and notifications.
- **Storage (MongoDB)**: Primary data store for users, chats, messages, and notifications.
- **Media (Cloudinary)**: External service for avatar and media hosting.
- **Jobs (Agenda)**: Background task processing for data retention and cleanup.

## Service Boundaries
- **AuthService**: Handles registration, login, and token management (JWT).
- **ChatService**: Orchestrates chat requests, deletions, and message history.
- **SocketService**: Manages real-time message delivery and presence tracking.
- **NotificationService**: Handles persistent and real-time user alerts.
- **UserService**: Manages user profiles and avatar uploads.

## Data Flow
1. **Request**: HTTP REST (Auth, User, Chat History).
2. **Real-time**: Socket.io (Messages, Typing, Presence, Notifications).
3. **Storage**: Mongoose (ODM) -> MongoDB.
4. **Offline**: Notifications created in DB and emitted if user is online.
