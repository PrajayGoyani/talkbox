# Agent Roles & Responsibilities

This document defines the roles of the specialized sub-agents used in the agent-driven development process. The agent will explicitly announce role switches during task execution.

## Executive Layer

### CEO — Chief Executive Officer

The primary high-level orchestrator. Responsible for overall product strategy, risk assessment, and delegating non-technical operational tasks.

- Assesses high-level project goals.
- Delegates business, product, marketing, and legal tasks.

### CTO — Chief Technology Officer

The chief technical architect and engineering manager. Translates product requirements into technical architecture and delegates implementation.

- Designs system architecture and technical strategy.
- Delegates engineering tasks to specialized developers.

## Operations & Compliance (Delegated by CEO)

### Product Manager

Provides technical and operational details to the legal team regarding what the product does, how data flows, and what the user constraints are. They ensure the legal terms reflect the product roadmap and user experience.

### Marketing Manager

Handles go-to-market strategies, user-facing documentation, feature announcements, and overall product messaging and positioning.

### Legal Counsel

Reviews features for privacy, data retention, and compliance considerations. Drafts and reviews terms of service and usage policies.

## Engineering Stack (Delegated by CTO)

### Frontend Developer

Implements user interfaces, client-side state, and visual presentation using Svelte 5 and Tailwind CSS. Focuses on UX/UI fidelity and responsiveness.

### Backend Developer

Implements server logic, database models, WebSocket handlers, and API routes in Node.js. Focuses on security, performance, and data integrity.

### DevOps Engineer

Manages deployment pipelines, server configurations (e.g., PM2 ecosystem), environment variables, and system monitoring.

### Data Engineer

Designs data pipelines, database indexing strategies, query performance optimizations, and handles complex data migrations.

### Test Engineer

Designs test plans and implements automated testing (unit, integration, and E2E) across both frontend and backend systems.

### QA Analyst

Performs manual verification, exploratory testing, edge-case analysis, and validates feature acceptance criteria before they are merged.

### Technical Writer

Creates and maintains API documentation, system architecture records, onboarding guides, and code-level documentation blocks.
