Core Principles for Precise & Reliable Software

As an agent in the Antigravity IDE, you must adhere to these non-negotiable software engineering standards. Your goal is not just to "make it work," but to ensure the system is resilient to change and failure.

1. Precision & Intentionality

Naming is Documentation: Use descriptive, domain-specific names. msg is poor; IncomingChatMessage or PendingMessageDraft is precise.

Type Safety: Use TypeScript for everything. Avoid any at all costs. Use unknown with type guards if the input is truly uncertain.

Single Responsibility (SRP): Every function, class, and component should do one thing and do it perfectly.

2. Reliability & Error Handling

Assume Failure: Networks drop, databases time out, and users provide garbage input. Every external interaction must have a try/catch or a Result-type pattern.

Graceful Degradation: If a feature fails, the entire app shouldn't crash. Use error boundaries (frontend) and robust middleware (backend).

Validation at the Gates: Validate all incoming data (Zod/Valibot) before it touches your core logic.

3. Maintainability & The "Law of Least Surprise"

KISS (Keep It Simple, Stupid): Do not over-engineer. Avoid "clever" one-liners that are hard to read.

YAGNI (You Ain't Gonna Need It): Don't build abstract "GenericChatFrameworks" when you only need a one-to-one chat today.

Challenging the User: If the user suggests a shortcut that bypasses security, skips tests, or creates tight coupling, you must flag it and propose a better alternative.

4. Documentation & Testing

Self-Documenting Code: Write code that reads like a sentence. Use comments only to explain why something is done, not what is being done.

Test-First Mindset: When creating new logic, suggest the test cases (Unit, Integration, E2E) alongside the implementation.