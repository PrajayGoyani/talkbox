# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-04-20

### Added

- **Message Deletion**: Implemented backend and frontend support for removing messages.
- **Confirmation Dialog**: Added a reusable modal for verifying user actions before execution.

### Changed

- **Path Aliases**: Improved frontend source code organization by using standardized path aliases.
- **Socket Synchronization**: Updated chat previews to reflect message removal in real-time.

### Fixed

- **Validation**: Prevented deletion of messages in chats that are marked as inactive or deleted.

## [1.2.0] - 2026-04-17

### Added

- **Emoji Disallowance**: Blocked disallowed emojis in the picker, messages, and reactions.
- **Alert System**: Added a global alert component for user feedback.
- **Mobile Tooltips**: Added touch support and improved positioning for mobile devices.

### Changed

- Optimized emoji scanning using a Unicode-aware regex.
- Centralized alert management in `uiStore`.

## [1.1.0] - 2026-04-17

### Added

- **Emoji System**: Integrated emoji picker with popover and large emoji rendering.
- **Background Actions**: Added job scheduling for data retention and cleanup.
- **Date Headers**: Added grouped message headers by date.
- **Loading States**: Added progressive loading for UI components.
- **Image Service**: Added WebP image optimization for avatars.
- **UI Components**: Added `Spinner` and `Icon` components.
- **Navigation**: Added "Jump to Latest" and username copy functionality.

### Changed

- **Backend**: Migrated backend to TypeScript.
- **Styles**: Standardized class management using `cn` utility.
- **State**: Centralized UI state and migrated status tracking to `SvelteMap`.
- **Responsive**: Updated mobile layout and sidebar behavior.
- **Input**: Replaced inputs with auto-resizing textareas.

### Fixed

- Improved avatar path handling.
- Optimized chat deletion and message grouping.
- Fixed layout spacing on touch devices.
- Improved origin and cookie handling for auth.

### Maintenance

- Switched build tool to `vite-plus`.
- Standardized package management with `pnpm`.
- Added Makefile and PM2 configuration.
- Added database seeder script.

## [1.0.0] - 2026-04-03

- Initial release with chat, auth, and real-time messaging.
