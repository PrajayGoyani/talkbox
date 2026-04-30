---
name: chat-security-auditor
description: Reviews code for security vulnerabilities specific to real-time chat, including E2EE integrity, token validation, and secure key storage.
---

# **Chat Security Auditor Skill**

## **Goal**

Enforce military-grade security standards for one-to-one private communication.

## **Core Instructions**

1. **E2EE Verification**: Ensure all messages are encrypted using the Signal Protocol primitives. Verify that private keys are never transmitted to the server.
2. **Storage Audit**: Check that mobile clients use expo-secure-store and web clients avoid LocalStorage for sensitive keys.
3. **Authentication Audit**: Ensure every socket event is authenticated and that userId is never trusted from the client payload without server-side session validation.
4. **Tool Use**: Use the provided Python script scripts/audit_encryption.py to simulate a MITM attack and verify the system's resilience.

## **Challenging Architectural Anti-Patterns**

A critical requirement for an agent-first IDE is the ability to challenge and correct poor architectural practices. The following sections outline how the Antigravity agent should be configured to proactively identify and mitigate technical debt.

### **Rejecting the "God Object" in Node.js**

Many developers begin Node.js projects by putting all routes, socket listeners, and database logic into a single server.js or app.js file. The agent must be instructed to critically challenge this pattern. When a user asks to "add a new feature to app.js," the agent should instead propose a refactor that extracts the logic into a dedicated Controller or Use Case.
The agent should explain the benefits of this refactor:

- **Improved Testability**: Individual use cases can be unit-tested in isolation without starting a network server.
- **Reduced Coupling**: Changing the database schema (e.g., from MongoDB to PostgreSQL) should not require changes to the business logic.
- **Onboarding Velocity**: New developers can navigate the project structure more easily when it follows a standard Clean Architecture.

### **Prohibiting State Fragmentation in the Frontend**

In complex real-time applications, frontend state can easily become fragmented across multiple components, leading to "ghost" messages or out-of-sync UI elements. The agent should enforce a single source of truth for global state, such as the conversation history and user presence.
If a user attempts to manage message state locally within a Svelte component that is deeply nested, the agent should suggest moving that state to a global Rune-based store. This ensures that state changes are propagated consistently throughout the application and that the UI accurately reflects the underlying data model.

### **Enforcing Non-Blocking Logic and Error Boundaries**

Node.js is notoriously sensitive to blocking code. If an agent identifies a synchronous file read (fs.readFileSync) or a CPU-heavy loop in a request handler, it must flag this as a performance risk. The agent should propose offloading heavy computation to worker threads or implementing the operation asynchronously to prevent the event loop from stalling, which would otherwise disconnect all active WebSocket clients.
Furthermore, the agent should ensure that every asynchronous operation is wrapped in a try-catch block or a promise catch handler. Unhandled rejections in Node.js can lead to process crashes; therefore, the agent must be configured to always include a global error handler and a graceful shutdown sequence that allows active socket connections to close properly before the process exits.

## **Conclusion: Orchestrating the Future of Development**

The move toward an agent-first IDE like Google Antigravity fundamentally redefines the role of the software architect. Instead of focusing on the minutiae of syntax, the architect's value lies in the precision of the high-level goals and the robustness of the agentic configuration. By providing the Antigravity agent with a clear cognitive architecture—comprising Clean Architecture rules, reliability-focused skills, and security-driven workflows—we transform the IDE from a passive editor into an active, intelligent collaborator.
For a one-to-one chat application, this configuration ensures that performance is optimized through Svelte 5’s compiled reactivity, scalability is achieved through Redis-backed Node.js microservices, and security is guaranteed through the Signal Protocol. Most importantly, it empowers the agent to act as a guardian of engineering quality, challenging the developer to build software that is not just functional, but reliable, maintainable, and secure by design. In the agent-first era, the best code is not necessarily the code we write ourselves, but the code we orchestrate through well-defined, autonomous systems.
