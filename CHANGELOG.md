# Changelog
 
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
