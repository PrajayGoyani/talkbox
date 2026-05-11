<!-- Generated: 2026-05-08 | Files scanned: ~160 | Token estimate: ~850 -->

# Frontend Architecture

## Page Tree

- **Guest Layout (`GuestApp`)**
  - `/`: Landing page (Welcome).
  - `/login`, `/signup`: Auth entry points.
  - `/forgot-password`, `/reset-password`: Recovery flows.
  - `/verify-email`: Email confirmation.
  - `/pricing`: Subscription plans (Free/Pro).
  - `/terms`, `/privacy`, `/faq`: Support & Legal docs.
- **Authenticated Layout (`AuthenticatedApp` - `/chat`)**
  - `/chat/conversations`: Active chat history.
  - `/chat/requests`: Incoming/Outgoing chat invitations.
  - `/chat/profile`: User account management.
  - `/chat/settings`: Theme and app preferences.

## Component Hierarchy (`App.svelte`)

1. **Authenticated Shell**
   - `IconRail`: Persistent sidebar navigation, notification badges, and logout.
   - `Sidebar` (`aside`): Contextual panels (`ConversationsPanel`, `ProfilePanel`, `RequestsPanel`, `SettingsPanel`).
   - `Main Content` (`section`):
     - `ChatWindow`: Messaging interface for the active conversation.
     - `WelcomeDashboard`: Default view when no chat is selected.
   - `Chat Partner Profile`: Sliding drawer for partner details and actions.
2. **Guest Shell**
   - `Header`: Shared navigation for non-app pages (Logo, Nav links, Auth buttons).
   - `Dynamic Content`: Renders `Login`, `Signup`, `Pricing`, etc.
3. **Global Overlays**
   - `NotificationsDropdown`: Historical alert management.
   - `ToastContainer`: Real-time system feedback.
   - `GlobalTooltip` / `ReactionTooltip`: UI helpers.
   - `ConfirmationDialog`: Transactional user confirmation flows.

## State Management (Svelte 5 Runes)

- **`authStore`**: Session state, profile persistence, and auth guards ($state).
- **`chatStore`**:
  - `chats` / `requests`: Reactive collections of domain data.
  - `socketManager`: Encapsulated WebSocket lifecycle and event multiplexing.
  - `onlineStatus` / `typingStatus`: Reactive maps for real-time presence/typing.
- **`uiStore`**: Global UI flags (sidebar, modals) and centralized navigation logic (`uiStore.navigate`).
- **`notificationStore`**: Centralized unread tracking and historical alert management.
- **`routerStore`**: Hash-based router with segment parsing and auth-aware guards.

## Logic & Patterns

- **Facade Delegation**: Services mirror backend facades to maintain consistent API boundaries.
- **Virtual Scrolling**: `MessageList` utilizes `overflow-anchor` for high-performance history rendering.
- **Pinning**: Local-first persistence for conversation order.
- **Lazy Loading**: Code-splitting for panels and views to optimize initial bundle size.
