# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-04-17

### Added
- **Emoji System**: Full Emoji Picker integration with popover support and "Jumbo Emoji" rendering for expressive messaging.
- **Background Actions**: Implemented background job scheduling using Agenda for automated data retention and cleanup.
- **Sticky Date Headers**: messages are now grouped by date with sticky headers for better readability.
- **Improved Loading**: Added progressive loading with conditional delays to ensure consistent and smooth UI feedback.
- **Image Processing**: New service using Sharp to standardize avatar uploads as optimized WebP images.
- **UI Components**: Introduced a standalone `Spinner` component and a robust `Icon` library.
- **Productivity**: Added a "Jump to Latest" button and username copy functionality in profile views.

### Changed
- **Backend Architecture**: Fully migrated the backend codebase from JavaScript to **TypeScript** for improved type safety and developer experience.
- **Class Management**: Integrated `cn` utility (using `clsx` and `tailwind-merge`) to standardize conditional class logic across the frontend.
- **State Management**: Migrated online status tracking to `SvelteMap` and centralized UI state management.
- **Responsive Design**: Significant overhaul of the mobile layout, including navigation rail transitions and responsive sidebar behavior.
- **Input Experience**: Replaced standard inputs with auto-resizing textareas and implemented auto-focus logic.

### Fixed
- Improved avatar URL generation and relative path handling.
- Optimized batch chat deletion and message grouping performance.
- Fixed layout spacing for various screen sizes (medium and touch devices).
- Sanitary check for allowed origins and global cookie pathing for authentication.

### Maintenance
- Migrated primary build tool to `vite-plus`.
- Standardized package management with `pnpm`.
- Added a `Makefile` and `PM2` ecosystem configuration for streamlined deployment.
- Introduced a database seeder script for easier development environment setup.

## [1.0.0] - 2026-04-03
- Initial stable release with core chat functionality, authentication, and real-time messaging.
