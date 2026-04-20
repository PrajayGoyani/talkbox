<!-- Generated: 2026-04-20 | Files scanned: ~60 | Token estimate: ~800 -->
# Frontend Architecture

## Page Tree
- **Guest Access**
  - `/login`: User authentication.
  - `/signup`: User registration.
  - `/terms`, `/privacy`: Legal documents.
- **Authenticated Access (`/chat`)**
  - `/chat/conversations`: Main chat listing and active conversations.
  - `/chat/requests`: Pending and outgoing chat invitations.
  - `/chat/profile`: Update personal info and avatar.
  - `/chat/settings`: App preferences and logout.

## Component Hierarchy (`App.svelte`)
1. **Layout Shell**
   - `IconRail`: Navigation icons, notifications count, logout.
   - `Sidebar` (`aside`): Dynamic panels based on active route.
     - `ConversationsPanel`, `ProfilePanel`, `RequestsPanel`, `SettingsPanel`.
   - `Main Content` (`section`):
     - `ChatWindow`: Active conversation view with message list and input.
     - `Home`: Welcome screen when no chat is selected.
2. **Global Overlays**
   - `NotificationsDropdown`: List of recent alerts.
   - `ToastContainer`: Real-time message alerts.
   - `GlobalTooltip`, `ReactionTooltip`, `ConfirmationDialog`.
   - `Alert`: Global error/info banners.

## State Management (Svelte 5 Runes)
- **`authStore`**: Manages user object, loading state, and session login/logout.
- **`chatStore`**:
  - `chats`: Array of active conversations.
  - `messages`: Map of messages for loaded chats.
  - `socket`: Connection to `Socket.io` backend.
  - `requests`: Pending chat invitations.
- **`uiStore`**: Handles global UI states (sidebar collapse, active alerts, navigation).
- **`routerStore`**: Custom hash-based router tracking URL segments.
- **`notificationStore`**: Tracks unread counts and historical notifications.

## Routing Logic
Uses a custom `routerStore` that listens to `hashchange` events. The `App.svelte` file uses derived runes to determine which snippets and components to render based on `routerStore.segments`.
