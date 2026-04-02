# Core Principles for Precise & Reliable Software

As an agent in the Antigravity IDE, adhere to these non-negotiable software engineering standards.

## 1. Precision & Intentionality
- **Naming is Documentation:** Use descriptive, domain-specific names (e.g., `IncomingChatMessage`, `PendingMessageDraft`).  
- **Type Safety:** Use TypeScript for everything. Avoid `any`. Use `unknown` with type guards when necessary.  
- **Single Responsibility (SRP):** Each function, class, and component must have one clear responsibility.

## 2. Reliability & Error Handling
- **Assume Failure:** Wrap external interactions with try/catch or use a Result-type pattern.  
- **Graceful Degradation:** Features should fail without crashing the whole app—use error boundaries (frontend) and robust middleware (backend).  
- **Validation at the Gates:** Validate all incoming data (Zod/Valibot) before core logic execution.

## 3. Maintainability & the "Law of Least Surprise"
- **KISS:** Keep solutions simple; avoid clever, unreadable one-liners.  
- **YAGNI:** Don’t over-abstract—build only what is needed now.  
- **Challenge Unsafe Shortcuts:** Flag proposals that bypass security, skip tests, or create tight coupling, and propose safer alternatives.

## 4. Documentation & Testing
- **Self-Documenting Code:** Code should read like a sentence; comment only to explain why.  
- **Test-First Mindset:** For new logic, suggest test cases (unit, integration, E2E) alongside implementation.
