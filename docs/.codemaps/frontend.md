<!-- Generated: 2026-04-30 | Files scanned: ~150 | Token estimate: ~800 -->
# Frontend Architecture

## Page Tree
- **Guest Access**
  - `/login`: User authentication.
  - `/signup`: User registration.
  - `/forgot-password`, `/reset-password`: Account recovery.
  - `/verify-email`: Registration completion.
- **Authenticated Access (`/chat`)**
  - `/chat/conversations`: Main chat listing.
  - `/chat/requests`: Pending chat invitations.
  - `/chat/profile`: Profile management and bio update.
  - `/chat/pricing`: Account upgrade (Free -> Pro).
  - `/chat/settings`: App preferences.

## Component Hierarchy (`App.svelte`)
1. **Layout Shell**
   - `IconRail`: Navigation, notifications badge, logout.
   - `Sidebar` (`aside`): Dynamic panels (`ConversationsPanel`, `ProfilePanel`, `RequestsPanel`, `SettingsPanel`).
   - `Main Content` (`section`):
     - `ChatWindow`: Active conversation view.
     - `Pricing`: Pro plan landing page.
     - `Home`: Default welcome view.
2. **Global Overlays**
   - `NotificationsDropdown`: Historical alerts.
   - `ToastContainer`: Real-time toast alerts.
   - `GlobalTooltip`: Shared tooltip system.
   - `ConfirmationDialog`: Atomic confirm/cancel flows.

## State Management (Svelte 5 Runes)
- **`authStore`**: User session, profile updates, and plan status ($state).
- **`chatStore`**:
  - `chats`: Array of active conversations with local pinning logic.
  - `messages`: Reactive array of messages for the active chat.
  - `socketManager`: Delegated WebSocket lifecycle and event handling.
  - `onlineStatus`: SvelteMap tracking partner presence.
  - `typingStatus`: SvelteMap tracking throttled typing events.
- **`uiStore`**: Global UI flags (sidebar, notifications, alerts).
- **`routerStore`**: Hash-based routing with segment parsing.

## Logic & Patterns
- **Virtual List**: `MessageList` uses `overflow-anchor` for stable scrolling.
- **Pinning**: Local-first pinning using `localStorage`.
- **Abort Controllers**: Prevent race conditions during concurrent REST requests.
- **Browser Notifications**: Integrated via the browser `Notification` API.

