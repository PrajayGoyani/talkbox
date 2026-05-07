<!-- Generated: 2026-05-08 | Files scanned: 5 | Token estimate: ~600 -->
# Project Dependencies (v1.7.0)

## Backend
- **Core**: `express` (v5), `typescript` (v6), `bun` (runtime).
- **ODM**: `mongoose` (v9).
- **Real-time**: `socket.io` (v4), `@socket.io/redis-adapter`.
- **Cache**: `ioredis`, `lru-cache` (L1/L2 strategy).
- **Auth**: `jsonwebtoken`, `bcrypt`.
- **Media**: `multer`, `cloudinary`, `sharp`.
- **Email**: `nodemailer`.
- **Validation**: `zod`.
- **Jobs**: `agenda`.
- **Monitoring**: `@sentry/bun`.

## Frontend
- **Framework**: `svelte` (v5).
- **Bundler**: `vite` (v6) via `vite-plus`.
- **Styling**: `tailwindcss` (v4), `tailwind-merge`, `clsx`.
- **Communication**: `socket.io-client`.
- **UI Components**: `emoji-picker-element`, `canvas-confetti`.

## Shared
- **Workspace**: `@root/shared` (Internal dependency).
- **Validation**: `zod`.

## External Integrations
- **MongoDB**: Primary database.
- **Cloudinary**: Cloud storage for profile avatars.
- **Vite Plus (vp)**: Unified build toolchain and development environment.
- **Sentry**: Error tracking and performance monitoring.

## Development Tools
- **Package Manager**: `bun` (v1.3.13).
- **Toolchain**: `vite-plus` (`vp`) for test, dev, and fmt.
- **Linter/Checker**: `svelte-check`, `tsc`.

