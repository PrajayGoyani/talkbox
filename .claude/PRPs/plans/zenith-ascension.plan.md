# Plan: Zenith Ascension (Free & Pro Tiers)

## Summary

Introduce a dual-tier subscription model to the `user-chat` platform. This plan implements backend enforcement of session and chat limits, a "Virtual Retention" strategy for message history, and a premium, glassmorphic frontend pricing experience.

## User Story

As a user, I want a clear distinction between Free and Pro plans, so that I can enjoy unlimited communication and history by upgrading to the Pro tier.

## Problem → Solution

Current "Everyone is Free" state allows unlimited sessions, chats, and 30-day retention for everyone → New "Zenith" state enforces 1 session / 5 chats / 7-day retention for Free users, while unlocking 10 sessions / Unlimited chats / 365+ day retention for Pro users.

## Metadata

- **Complexity**: Large
- **Source PRD**: N/A (Feature Request)
- **PRD Phase**: standalone
- **Estimated Files**: ~12 files

---

## UX Design

### Before

```
┌─────────────────────────────┐
│  Sidebar:                   │
│  [Chat] [Profile] [Settings]│
│                             │
│  Profile:                   │
│  - Name: John Doe           │
│  - Plan: (Missing)          │
└─────────────────────────────┘
```

### After

```
┌─────────────────────────────┐
│  Sidebar:                   │
│  [Chat] [Profile] [Settings]│
│  [Diamond Icon (Pricing)]   │
│                             │
│  Profile:                   │
│  - Name: John Doe           │
│  - Plan: [PRO] (Badge)      │
│                             │
│  Chat History (Free):       │
│  [Message 1 (Scrubbed)]     │
│  [Message 2 (Current)]      │
└─────────────────────────────┘
```

### Interaction Changes

| Touchpoint     | Before             | After                            | Notes                                |
| -------------- | ------------------ | -------------------------------- | ------------------------------------ |
| Sidebar        | 4 Icons            | 5 Icons (+Pricing)               | Pricing uses a diamond/star icon.    |
| Chat List      | No limit           | Error at 6th chat                | "Limit reached" AppError thrown.     |
| Socket Connect | Takeover (Always)  | Takeover (Free) / Parallel (Pro) | Pro users can have 10 tabs.          |
| Message View   | Full history (30d) | Scrubbed after 7d (Free)         | Content replaced with upgrade nudge. |

---

## Mandatory Reading

Files that MUST be read before implementing:

| Priority       | File                                     | Lines   | Why                                  |
| -------------- | ---------------------------------------- | ------- | ------------------------------------ |
| P0 (critical)  | `backend/src/services/socket.service.ts` | 29-55   | Core session enforcement.            |
| P0 (critical)  | `backend/src/services/chat.service.ts`   | 340-377 | Message retrieval & scrubbing logic. |
| P1 (important) | `backend/src/utils/AppError.ts`          | 56-62   | Pattern for limit errors.            |
| P2 (reference) | `frontend/src/lib/views.ts`              | all     | View registration pattern.           |

---

## Patterns to Mirror

### NAMING_CONVENTION

// SOURCE: backend/src/models/user.model.ts:7-12

```typescript
export interface IUser extends Document {
  username: string;
  name: string | null;
  // Use snake_case for DB fields if existing, camelCase for TS
}
```

### ERROR_HANDLING

// SOURCE: backend/src/utils/AppError.ts:56-62

```typescript
throw AppError.limitReached("Active chats", "CHAT_LIMIT_REACHED");
```

### SERVICE_PATTERN

// SOURCE: backend/src/services/chat.service.ts:12-23

```typescript
class ChatService {
  constructor(chatModel: typeof ChatModel, ...) { ... }
}
```

---

## Files to Change

| File                                                     | Action | Justification                                 |
| -------------------------------------------------------- | ------ | --------------------------------------------- |
| `backend/src/models/user.model.ts`                       | UPDATE | Add `plan`, `subscriptionExpiresAt`, and index. |
| `backend/src/services/socket.service.ts`                 | UPDATE | Manage `Set<Socket>` and enforce limits.      |
| `backend/src/services/chat.service.ts`                   | UPDATE | Implement 5-chat limit and virtual scrubbing. |
| `backend/src/jobs/agenda-jobs.ts`                        | UPDATE | Add downgrade job & adjust retention.         |
| `backend/src/jobs/jobs.ts`                               | UPDATE | Schedule downgrade job (hourly).              |
| `backend/src/controllers/subscription.controller.ts`     | CREATE | Simulated upgrade endpoint.                   |
| `backend/src/routes/routes.ts`                           | UPDATE | Register subscription routes.                 |
| `frontend/src/lib/state/chat.svelte.ts`                  | UPDATE | Handle session_error for takeover.            |
| `frontend/src/lib/components/views/Pricing.svelte`       | CREATE | Premium pricing UI.                           |
| `frontend/src/lib/views.ts`                              | UPDATE | Register Pricing view.                        |
| `frontend/src/lib/state/router.svelte.ts`                | UPDATE | Allow `/pricing` route.                       |
| `frontend/src/lib/components/layout/IconRail.svelte`     | UPDATE | Add diamond icon for Pricing.                 |
| `frontend/src/lib/components/panels/ProfilePanel.svelte` | UPDATE | Display plan badge.                           |

---

## NOT Building

- Real payment gateway integration (Stripe/PayPal).
- Refund logic.
- Subscription cancellation flow (handled as "manual expiration").

---

## Step-by-Step Tasks

### Task 1: Extend User Schema

- **ACTION**: Add `plan` and `subscriptionExpiresAt` to `UserModel`.
- **IMPLEMENT**: Define enum `['free', 'pro']`. Default to `'free'`.
- **VALIDATE**: Check MongoDB record for a newly registered user.

### Task 1.5: Automatic Downgrade Job

- **ACTION**: Add a background job to transition expired Pro users to Free.
- **IMPLEMENT**: In `agenda-jobs.ts`, define `JOBS.SUBSCRIPTION_EXPIRY`. Query: `User.updateMany({ plan: 'pro', subscriptionExpiresAt: { $lt: new Date() } }, { plan: 'free' })`. In `jobs.ts`, schedule it to run every "1 hour".
- **VALIDATE**: Set a user's `subscriptionExpiresAt` to 5 mins in the past and trigger/wait for the job.

### Task 2: Refactor Socket Session Logic

- **ACTION**: Modify `SocketService` to allow multiple connections for Pro users and emit takeover events.
- **IMPLEMENT**: Change `activeConnections` to `Map<string, Set<TypedSocket>>`. In `handleConnection`, check `plan`. If Free and `Set.size > 0`, iterate existing sockets, emit `session_error` with `{ reason: 'takeover', message: 'Session opened in another window.' }`, then call `disconnect(true)`. If Pro and `Set.size >= 10`, reject new.
- **MIRROR**: Preserve existing heartbeat/cleanup logic in `socket.service.ts`.
- **VALIDATE**: Open 2 tabs as Free (first should receive error and disconnect). Open 3 tabs as Pro (all stay).

### Task 2.5: Handle Session Takeover on Frontend

- **ACTION**: Listen for the `session_error` socket event and display a modal.
- **IMPLEMENT**: In `frontend/src/lib/state/chat.svelte.ts`, add a socket listener for `session_error`. If `data.reason === 'takeover'`, disconnect socket internally and present a modal using `confirmStore.show({ title: 'Session Disconnected', message: '...', confirmText: 'Upgrade to Pro', cancelText: 'Reconnect', variant: 'warning' })`. If the user chooses to upgrade, route to `/pricing`. If they choose to reconnect, call `chatStore.connect()`.
- **MIRROR**: Use `confirmStore` from `frontend/src/lib/state/confirm.svelte.ts`.
- **VALIDATE**: Open app in two windows as a Free user; verify the first window shows the takeover modal and doesn't auto-reconnect invisibly.

### Task 3: Enforce Chat Limits

- **ACTION**: Update `ChatService.requestChat` to count active chats.
- **IMPLEMENT**: `const count = await this.Chat.countDocuments({ $or: [{userA}, {userB}], status: 'accepted' })`. Throw `AppError.limitReached` if `count >= 5` and user is Free.
- **VALIDATE**: Try to create a 6th chat as a Free user.

### Task 4: Implement Virtual Retention (Scrubbing)

- **ACTION**: Update `ChatService.getChatMessages`.
- **IMPLEMENT**: For each message, if `user.plan === 'free'` AND `message.createdAt < Date.now() - 7 days`, replace `contentBody` with "Limit reached. Upgrade to Pro to view history."
- **VALIDATE**: Ensure a Pro user can see the same message clearly.

### Task 5: Create Pricing Experience

- **ACTION**: Develop `Pricing.svelte` and register it.
- **IMPLEMENT**: Use glassmorphism cards and a simulated checkout modal.
- **MIRROR**: Follow the Tailwind patterns in `auth/Login.svelte` for consistency.
- **VALIDATE**: Navigate to `/pricing` and see the premium UI.

---

## Testing Strategy

### Unit Tests

- `SocketService`: Test session limit enforcement with mocked users.
- `ChatService`: Test message scrubbing with mixed-tier participants.

### Edge Cases Checklist

- [ ] User upgrades while having active sessions (should immediately unlock).
- [ ] Message exactly 7 days old (boundary check).
- [ ] Chat request accepted by a Free user who is already at 5 chats.

---

## Validation Commands

### Static Analysis

```bash
npx tsc --noEmit
```

EXPECT: Zero type errors

### Visual Validation

- Verify "Upgrade to Pro" animation in browser.
- Verify "Pro" badge in Profile.

---

## Acceptance Criteria

- [ ] Free users restricted to 1 session.
- [ ] Pro users allowed up to 10 sessions.
- [ ] Messages older than 7 days scrubbed for Free users.
- [ ] 5-chat limit enforced for Free users.
- [ ] Premium pricing page accessible via Sidebar.
- [ ] Confetti animation on successful simulated purchase.
