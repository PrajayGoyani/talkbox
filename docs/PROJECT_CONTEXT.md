# **High-Level Project Architecture**

This document serves as the "Source of Truth" for any agent or developer navigating this repository.

## **📂 Directory Layout**

### **[./frontend] - Svelte 5 Application (MISSING)**

> [!WARNING]
> This directory is currently missing from the root of the repository. It is described here for architectural completeness, but the physical files are not yet present.

- /src/lib/components: Atomic UI components (ChatBubble, UserList, InputField).
- /src/lib/state: Svelte 5 Runes logic for chat session management.
- /src/lib/api: API wrappers and WebSocket client logic.
- /src/routes: SvelteKit-style routing and page-specific logic.

### **[./back-end] - Node.js API & Socket Server**

- /src/controllers: Request/Response handling and Socket event listeners.
- /src/services: Core Chat Logic (Message processing, filtering, notifications).
- /src/models: Database schemas and Type definitions.
- /src/middleware: Auth, Rate Limiting, and Validation.

## **🔄 Data Flow (One-to-One Chat)**

1. **Initiation:** Client A sends a message via WebSocket to ./back-end.
2. **Validation:** Backend validates message schema (Zod) and permissions (Service Layer).
3. **Persistence:** Message is saved to DB.
4. **Delivery:** Backend emits event to Client B.
5. **Acknowledgment:** Client A receives "Sent" status; UI updates accordingly.

## **🚨 Critical Constraints**

- **Concurrency:** Handle race conditions where two users send messages simultaneously.
- **Idempotency:** Ensure the same message isn't processed twice due to network retries.
- **Performance:** Message history should be paginated or windowed to prevent memory leaks in the frontend.
