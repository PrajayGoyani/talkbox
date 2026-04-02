---
description: A structured sequence for implementing a new functional requirement from end-to-end.
---

## **Steps**

1. **Plan**: Research existing patterns in the codebase. Create an implementation_plan.md identifying the Entity, Use Case, and Controller changes.
2. **Review**: Present the plan for human approval before proceeding to code.
3. **Execute**: 
   * Implement the Entity and unit tests first.
   * Implement the Use Case and ensure it remains framework-agnostic.
   * Implement the Controller and integrate with Socket.IO/Express.
   * Add the frontend Svelte component using Runes for state.
4. **Verify**: Run the full test suite. Launch the integrated browser to perform a functional verification of the UI and record the session.
5. **Summarize**: Generate a walkthrough.md with screenshots and a summary of the changes.