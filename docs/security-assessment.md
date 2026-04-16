# Security Assessment: Client-Side Message Encryption

This document outlines the current security posture of the client-side encryption implementation in Talkbox.

## Overview

Messages in Talkbox are encrypted on the client side using the **Web Crypto API (AES-256-GCM)** before being transmitted to the server. This provides a layer of confidentiality and integrity even if the server or database is compromised.

## What is Protected

| Threat                          | Protected? | Rationale                                                                                                                                             |
| ------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Database Breach**             | ✅ Yes     | Messages are stored as AES-256 ciphertext in MongoDB. Even with direct database access, an attacker cannot read the message contents without the key. |
| **Network Interception (MITM)** | ✅ Yes     | All traffic is encrypted via **TLS 1.2+** (managed by Render). Adding application-level encryption provides "Defense in Depth."                       |
| **Server-Side Snooping**        | ✅ Yes     | The backend server never sees plaintext messages. It only routes and stores the ciphertext. Server admins cannot read user chats.                     |
| **Log Leakage**                 | ✅ Yes     | Any server-side logging of message objects (e.g., in debug mode) will only capture the encrypted `contentBody`.                                       |

## Current Limitations & Risks

> [!WARNING]
> The current implementation uses a **Shared Symmetric Key** baked into the frontend bundle. This has several security implications.

| Risk                  | Assessment  | Mitigation / Note                                                                                                                                   |
| --------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exposed Key**       | ❌ High     | The `VITE_ENCRYPTION_KEY` is embedded in the JavaScript bundle. Any sophisticated user can extract this key using browser DevTools.                 |
| **Global Decryption** | ❌ High     | Since the key is shared, anyone who extracts it can decrypt **any** message from **any** user in the system.                                        |
| **No Key Rotation**   | ❌ Moderate | Changing the key in `.env` will make all existing historical messages in the database undecryptable by the client.                                  |
| **Not True E2EE**     | ❌ High     | This is "Client-Side Encryption" but not true "End-to-End Encryption" (E2EE) like Signal, as users do not have unique per-session or per-user keys. |

## Future Roadmap: Scaling to True E2EE

To achieve industry-standard security (Signal/WhatsApp level), the following changes would be required:

1.  **Asymmetric Key Pairs**: Every user generates a public/private key pair on their device.
2.  **Key Exchange (Diffie-Hellman)**: When a chat starts, users exchange public keys to derive a unique **Shared Secret** for that specific conversation.
3.  **Local Key Storage**: Private keys are never sent to the server; they are stored in the user's browser `indexedDB` or localized `localStorage`.
4.  **Double Ratchet Algorithm**: For maximum security, keys should rotate with every message sent to prevent "Future Secrecy" compromises.

## Conclusion

The current implementation is an excellent "Medium-Security" solution. It protects against the most common cloud vulnerabilities (DB leaks, infrastructure snooping) while keeping the architecture simple. It serves as a strong foundation for future privacy enhancements.

---

## 🛡 Security

Talkbox takes security seriously. All messages are encrypted on the client-side using **AES-256-GCM** before being sent to the server. For a detailed breakdown of our security measures and current assessment, see [Security Assessment](file:///home/dev/Documents/work/other/projects/user-chat/docs/security-assessment.md).
