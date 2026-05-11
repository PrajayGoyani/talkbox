# Changelog

## [1.8.0] - 2026-05-11

### Added

- **Monorepo Migration**: Transitioned to a formal monorepo structure with dedicated `frontend`, `backend`, and `shared` workspaces using Bun.
- **Engaging Loader**: Implemented a dynamic "engaging loader" system with backend-driven quotes and environment-controlled toggles.
- **Touch-Friendly Tooltips**: Added long-press support for tooltips on mobile devices with light-dismiss behavior.
- **Active Chat Tracking**: Implemented real-time tracking of active chat windows to optimize read status updates and notifications.
- **Unified State Management**: Centralized chat state orchestration using Svelte 5 runes and persistent socket managers.
- **Knowledge Graph Integration**: Integrated `code-review-graph` and `graphify` for enhanced developer context and impact analysis.

### Changed

- **Backend Architecture**: Fully refactored the backend into domain-driven services and implemented an event-driven decoupling pattern with dedicated repositories.
- **Shared Package**: Consolidated types, constants, and utilities into a new `@user-chat/shared` workspace package.
- **Unified Tooling**: Standardized development, building, and testing under the `vite-plus` (`vp`) toolchain across all workspaces.
- **Redis Modularization**: Split the monolithic Redis service into specialized components for sessions, presence, and guards.
- **Graceful Shutdown**: Enhanced the shutdown sequence with configurable timeouts and improved connection handling.

### Fixed

- **Socket Connectivity**: Resolved memory leaks and duplicate event listeners in the socket management layer.
- **Auth Integrity**: Fixed `undefined` bearer token errors and standardized service headers for API requests.
- **UI Reactivity**: Fixed Svelte 5 reactivity edge cases, including key duplication and stale unread states.
- **Toast Notifications**: Eliminated duplicate toast event listeners that caused multiple notifications for single events.


## [1.7.0] - 2026-04-28

### Added

- **Agent-Driven Development**: Implemented a hierarchical workflow for AI agents, establishing a top-down delegation protocol consisting of Executive (CEO/CTO), Operations (PM/Marketing/Legal), and Engineering (Frontend/Backend/Test/Data/QA/Docs) roles.
- **Workflow Automation**: Created `.agent/workflows/delegate.md` for structured reasoning frameworks, ensuring multi-agent perspectives and technical compliance inside `.antigravityrules.md` and `ROLES.md`.
- **Graceful Shutdown**: Solidified backend lifecycle management, ensuring clean termination of HTTP server, MongoDB connections, Redis clients, and Agenda workers.

### Changed

- **Component Decomposition**: Successfully refactored the monolithic `ChatWindow.svelte` into modular, high-performance components including `MessageList`, `MessageBubble`, and `ChatHeader`.
- **Svelte 5 Runes**: Completed the migration of core chat components to Svelte 5 reactive runes (`$state`, `$derived`, `$effect`).
- **UI UX Polish**: Enhanced the "Jump to Latest" visibility, reaction picker placement, and mobile sidebar responsiveness.

### Fixed

- **Validation Middleware**: Resolved a critical `TypeError` when sanitizing request data by correctly handling readonly property descriptors.
- **Layout Consistency**: Fixed sidebar shrinking and layout shifting during message history loading.


## [1.6.0] - 2026-04-24

### Added

- **Advanced Auth Flows**: Support for password resets and email verification.
- **System Monitoring**: Integrated Sentry for backend error tracking and alerting.
- **Background Tasks**: Implemented Agenda worker for automated state synchronization.
- **Distributed Caching**: High-performance user lookups and cache invalidation using Redis.
- **Server Protection**: Added rate limiting and event throttling (e.g., typing indicators) to ensure stability under load.
- **Delivery Reliability**: Implemented message idempotency to prevent duplicate deliveries during retries.
- **Performance Testing**: Added a suite of scalability benchmarks and unit tests.

### Changed

- **Reactivity Upgrade**: Migrated frontend state management to Svelte 5 runes for improved client-side performance.
- **Modular Architecture**: Decoupled socket events into dedicated handlers for messages, typing, and reactions.
- **UI Refinements**: Enhanced chat context menus, headers, and input interactions.
- **Usage Policies**: Refined active chat limits and message history visibility for Free accounts.

### Fixed

- **Multi-device Sync**: Standardized login takeover behavior when a user connects from a second device.
- **Cache Consistency**: Fixed race conditions in participant list updates during high-traffic events.

## [1.5.0] - 2026-04-22

### Added

- **Zenith Ascension**: Tiered subscription model (Free vs. Pro).
- "Exclusive Pro Badge" visible to chat partners in header and list.
- Premium glassmorphic Pricing page with simulated checkout.
- Cursor-based pagination for chats, requests, and search queries.
- Rich text rendering for links and code blocks in chat messages.
- Comprehensive unit testing suite for chat and socket services using Vitest.
- Automated background jobs for subscription expiry and message retention.
- Virtual Scrubbing (masking) for Free users on messages older than 7 days.

### Changed

- Updated Message Retention policy to 365 days for Free accounts (Unlimited for Pro).
- Enforced session limits: 1 for Free users (with takeover), 10 for Pro users.
- Enforced 5 active chat limit for Free users.
- Refactored message parsing logic for improved reliability.
- Standardized backend project structure and implemented path aliasing.
- Improved mobile responsiveness in ChatWindow and simplified ConversationsPanel UI.
- Updated Terms of Use and Privacy Policy for full data policy transparency.
- Synchronized all environment variables in `.env.example`.

## [1.4.0] - 2026-04-20

### Added

- View registry and lazy loading component.
- Makefile task caching and incremental builds.
- Retry logic and error indicators for dynamic imports.

### Changed

- Scroll throttling for lazy components.
- Integrated Home view into App shell.
- Authenticated component pre-loading.

### Maintenance

- Backend build configuration.
- Frontend dependency tree.

## [1.3.0] - 2026-04-20

### Added

- Backend and frontend message deletion.
- Modal confirmation dialog.

### Changed

- Frontend path aliases.
- Real-time socket synchronization for deletions.

### Fixed

- Inactive chat message validation.

## [1.2.0] - 2026-04-17

### Added

- Emoji blocking in picker and messages.
- Global alert system.
- Mobile tooltip support.

### Changed

- Regex-based emoji scanning.
- Centralized alert management.

## [1.1.0] - 2026-04-17

### Added

- Emoji picker and rendering.
- Scheduled cleanup jobs.
- Message date headers.
- UI loading states.
- WebP avatar optimization.
- Spinner and Icon components.
- Username copy and scroll-to-latest.

### Changed

- Backend TypeScript migration.
- CSS class management utility.
- Centralized UI state management.
- Mobile sidebar layout.
- Auto-resizing textareas.

### Fixed

- Avatar path handling.
- Chat deletion and grouping logic.
- Mobile layout spacing.
- Auth cookie handling.

### Maintenance

- vite-plus build tool.
- pnpm package management.
- Makefile and PM2 configuration.
- Database seeder.

## [1.0.0] - 2026-04-03

- Initial release.
