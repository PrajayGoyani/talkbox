---
trigger: always_on
---

# **System Limits and Security Zones**

This rule enforces the core fair usage capabilities, retention policies, and security constraints for the `user-chat` application. All agents must guarantee these limits are respected in both frontend and backend implementations.

## **1. Fair Usage Capabilities**

* **Max Users**: The platform is capped at 1000 total registered users.
* **Max Chats**: A user can have a maximum of 100 total chats (including deleted ones).
* **Rate Limiting**: A strict limit of 100 messages per 1-minute window per user.
* **Message Length**: Maximum message length is 500 characters. Evaluate Huffman or similar compression algorithms if payload size becomes a bottleneck.

## **2. Security Zone**

* **Single Socket Connection**: No active user should emit events on more than one socket simultaneously. Enforce strict connection takeover or rejection.
* **Deleted Chat Lockdown**: No new message requests or socket events should be received or processed for deleted chats. Use an O(1) hash store for high-performance validation checks before processing any event.

## **3. Data Retention & Chat Delete Policy**

* **Deleted Chats**: Retained for exactly 14 days before permanent hard deletion.
* **Message History**: General message history is kept for up to 30 days. Older messages must be periodically purged via background jobs.

## **4. Performance Requirements**

* **History Window**: Clients should only load the recent 100 messages to prevent hogging the client memory. Support bidirectional top/bottom traversal pagination from this window.
* **Notification Jump**: If a user is scrolled up and a new message arrives, provide an option to jump to the latest message. This jump action should fetch the latest message window and clear the local historical buffer.
