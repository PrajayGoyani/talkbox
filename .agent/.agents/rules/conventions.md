---
trigger: always_on
---

## **Core Principles**

* **Maintainability First**: Favor readability and modularity over clever "magic" one-liners or micro-optimizations.
* **Explicit vs Implicit**: Avoid implicit state mutations. Use clear, descriptive variable and function names.
* **Clean Architecture**: Strictly enforce the separation between Entities, Use Cases, and Controllers. Challenge any attempt to leak database details into business logic.

## **Technical Stack Guidelines**

* **Backend (Node.js)**:  
  * All I/O must be asynchronous. Never block the event loop.
  * Use Dependency Injection for all service layers to ensure testability.
  * Every external API call must include a timeout and a retry strategy with exponential backoff.
* **Frontend (Svelte 5\)**:  
  * Utilize Svelte 5 Runes ($state, $derived, $effect) exclusively for reactive state.
  * Components must be kept small and focused on a single responsibility.
  * Use Svelte's built-in store system for cross-component state management.

## **Security & Reliability**

* **Zero Trust**: Validate and sanitize all client-side data on the server. Never assume a userId from a socket event is correct; always verify against the session.
* **Idempotency**: All state-changing operations (e.g., saving a message) must implement a deduplication check. 
* **Encryption**: Do not attempt to implement custom cryptographic logic. Use libsignal-protocol-typescript for all E2EE requirements.

### **Orchestration Workflows**

Workflows are Markdown files that define a structured sequence of prompts or tasks for the agent to follow. These are particularly useful for repetitive architectural tasks.