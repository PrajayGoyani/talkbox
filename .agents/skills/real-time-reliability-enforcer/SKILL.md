---
name: real-time-reliability-enforcer
description: Applies best practices for reliable message delivery, sequence ordering, and idempotency in chat applications. Use when building or refactoring messaging logic.
---

# **Real-Time Reliability Skill**

## **Goal**

Ensure every message is delivered exactly-once (effectively) and displayed in the correct order.

## **Core Instructions**

1. **Deduplication**: When implementing a message saving routine, check for a client_id or message_id in the inbox table. Reject duplicates.
2. **Atomic Writes**: Ensure database updates and Redis broadcasts happen within the same logical transaction using the Outbox Pattern.
3. **Sequence Buffering**: On the frontend, implement a buffer to hold messages that arrive out of order based on their sequence number.
4. **Validation**: Use a script in the scripts/ folder to validate that the sequence logic correctly handles gaps and duplicates.

## **Examples**

* **Input**: "Add a function to save messages."  
* **Response**: The agent should propose a plan that includes adding an idempotency_key column to the messages table and implementing the check-before-insert logic.

### **Defining a Security Audit Skill**

This skill focuses on the cryptographic integrity of the application, challenging the agent to avoid common security pitfalls.