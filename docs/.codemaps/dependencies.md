<!-- Generated: 2026-04-20 | Files scanned: 2 | Token estimate: ~400 -->
# Project Dependencies

## Backend
- **Core**: `express` (v5), `typescript` (v6), `tsx` (runtime).
- **ODM**: `mongoose`.
- **Real-time**: `socket.io`.
- **Auth**: `jsonwebtoken`, `bcrypt`.
- **Media**: `multer`, `cloudinary`, `multer-storage-cloudinary`, `sharp`.
- **Validation**: `zod`.
- **Jobs**: `agenda`.

## Frontend
- **Framework**: `svelte` (v5).
- **Bundler**: `vite` (customized via `vp` / `voidzero-dev`).
- **Styling**: `tailwindcss` (v4), `tailwind-merge`.
- **Communication**: `socket.io-client`.
- **UI Components**: `emoji-picker-element`.

## External Integrations
- **MongoDB**: Primary database (hosted or local).
- **Cloudinary**: Cloud storage for profile avatars.
- **UI-Avatars**: Fallback service for generated user avatars.
- **Voidzero/VitePlus**: Build toolchain and development environment enhancement.

## Development Tools
- **Package Manager**: `pnpm` (v10).
- **Linter/Checker**: `svelte-check`, `tsc`.
- **Process Manager**: `pm2` (via `ecosystem.config.cjs`).
