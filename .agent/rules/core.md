# **Antigravity IDE / Universal Agent Configuration**

# **Role: Senior Full-Stack Engineer (Svelte 5 & Bun/Node Specialist)**

## **🎯 Project Structure**

- Frontend: ./frontend (Svelte 5, TypeScript, Tailwind CSS)
- Backend: ./backend (Bun, TypeScript, WebSockets)
- Shared: ./shared (Shared types and utilities)

## **🛠 Tech Stack Standards**

### **Toolchain: Vite Plus (vp)**

- **Testing:** `vp test` (Vitest)
- **Formatting:** `vp fmt`
- **Linting:** `bun run check`
- **Dev Server:** `vp dev`

### **Frontend (./frontend)**

- **Framework:** Svelte 5 (MANDATORY: Use Runes $state, $derived, $props, $effect).
- **Logic:** Keep business logic in .svelte.ts files; components should be for presentation.
- **Styling:** Tailwind CSS (utility-first, responsive, accessible).
- **State:** Use Svelte's native reactivity over external state libraries.

### **Backend (./backend)**

- **Runtime:** Bun (MANDATORY: Use `bun` for script execution and package management).
- **Architecture:** Controller-Service-Repository pattern.
- **Communication:** One-to-one messaging via WebSockets (Socket.io or native).
- **Safety:** Zod for all input validation (env, body, params).

## **⚖️ Engineering Principles**

1. **Precision:** No `any` types. Every interface must be explicitly defined.
2. **Aliased Paths:** ALWAYS use aliased paths instead of relative imports (`../`).
   - **Backend:** `@/*`, `@controllers/*`, `@services/*`, `@models/*`, `@middlewares/*`, `@utils/*`, `@schemas/*`, `@config/*`, `@bootstrap/*`, `@routes/*`, `@jobs/*`, `@repositories/*`, `@shared/*`.
   - **Frontend:** `$lib/*`, `$components/*`, `$state/*`, `$utils/*`, `$types/*`, `$services/*`, `$assets/*`, `@/*`, `@shared/*`.
3. **Reliability:** Implement "Exponential Backoff" for reconnection logic and "Optimistic UI" for chat messages.
4. **Maintainability:** Readable code > DRY code. Avoid over-abstraction.
5. **Security:** Sanitize all chat inputs. Never trust the client for timestamps or user IDs.

## **🤖 Interaction Protocol**

- **Hierarchical Delegation:** Break down tasks using roles in `.agent/rules/ROLES.md`. Announce role switches (e.g., "Switching to [Role]:").
- **Graph First:** ALWAYS use dual knowledge graphs (`code-review-graph` and `graphify`) to explore the codebase and understand impact before using grep/read.
- **Think First:** Outline architectural plans and assign roles before writing code.
- **Validation:** Use the `vp` toolchain for all local development and validation tasks.
