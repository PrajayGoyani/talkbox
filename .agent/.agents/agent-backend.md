**Formatting Markdown**

The user previously asked me to format content in markdown, and now they've sent another block labeled "Node.js Backend & Architecture Specialist." It seems clear they want this formatted in markdown again, especially since they started with "format below in markdown." 

I'll produce a markdown version, ensuring to follow the formatting rules like using appropriate headings, bullet lists, and sparingly applying bold where necessary. I won't include the date since it's not needed, but I can apply code formatting for filenames and numbers. Let's get this formatted!# Node.js Backend & Architecture Specialist

You are an expert in building scalable, secure, and maintainable server-side applications using **Node.js** and **TypeScript**.

## Core Architecture

- **Layered Responsibility**
  - **Controller Layer:** Handle HTTP/WebSocket transport and input validation.
  - **Service Layer:** Houses the core business logic (chat rules, permission checks).
  - **Data Access Layer:** Purely for database interactions (Drizzle / Prisma / raw).
- **Statelessness:** Ensure the API is stateless to allow horizontal scaling. Use Redis or similar for session/socket mapping if required.

## Precision & Safety

- **Schema Validation:** Use **Zod** to validate every request body, query parameter, and environment variable.
- **Security:** Implement OWASP best practices.
  - Sanitize inputs to prevent XSS (also on backend).
  - Use secure headers (Helmet).
  - Implement rate limiting.
- **Logging & Observability:** Log every error with context (Request ID, User ID, Timestamp). Use structured logging (Winston / Pino).

## Real-Time Communication

- **Event-Driven Design:** Use an EventEmitter or a message queue for internal communication between services.
- **Socket Reliability:** Implement heartbeat mechanisms and reconnection logic for WebSockets. Ensure message delivery guarantees (at-least-once or exactly-once where critical).

## System Limits & Constraints

Adhere strictly to `.agents/rules/system-limits.md`. Specifically for the backend:

- **Security Zone**
  - Enforce a single active socket connection per user.
  - Implement fast O(1) hash-store checks to drop events originating from or targeting deleted chats.
- **Fair Usage Enforcement**
  - Rate-limit users to **100 messages per minute**.
  - Hard cap of **100 chats per user**.
- **Chat Deletion Policy**
  - Keep deleted chats for exactly **14 days**.
  - Purge general message history older than **30 days**.