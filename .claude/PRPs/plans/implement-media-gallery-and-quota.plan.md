# Plan: Chat Media Gallery and Storage Quota

## Summary
Implement a side drawer for users to easily view all media and documents shared within a chat. Additionally, introduce a strong backend quota feature restricting each chat's total attachment storage size to 500MB, seamlessly managed by decrementing the quota when users delete their previously uploaded attachment files.

## User Story
As a chat user, I want to see a Gallery Drawer to browse past attachments and selectively delete them, so that I can reclaim our shared 500MB chat storage quota.

## Problem → Solution
Users cannot easily find old attachments or manage storage -> A Media Gallery drawer provides an organized list of past files with delete capabilities, seamlessly bounded by a fixed 500MB quota managed on the backend.

## Metadata
- **Complexity**: Medium
- **Source PRD**: N/A
- **Estimated Files**: 5

---

## UX Design

### After
```
┌─────────────────┬───────────────────┐
│                 │ [Gallery Drawer]  │
│ [ Chat Area ]   │ - Media Tab       │
│                 │ - Docs Tab        │
│                 │ [Item  🗑️]        │
└─────────────────┴───────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Chat Header | No info button | Adds "Info/Gallery" icon | Opens the right-side drawer. |
| Chat Storage | Uncapped overhead | 500MB limit | API gracefully rejects file uploads crossing the limit, triggering a toast alert. |

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `backend/src/models/chat.model.ts` | UPDATE | Add `storageUsed: { type: Number, default: 0 }`. |
| `backend/src/models/message.model.ts` | UPDATE | Add `fileSize: { type: Number, default: 0 }` to track cost per attachment. |
| `backend/src/routes/chat.routes.ts` | UPDATE | Add `GET /:chatId/attachments` and `DELETE /:chatId/attachments/:messageId`. |
| `backend/src/controllers/chat.controller.ts`| UPDATE| Add logic to fetch paginated attachments and securely delete them, freeing up `storageUsed`. |
| `backend/src/middlewares/upload.middleware.ts`| UPDATE| Ensure upload middleware logic verifies `chat.storageUsed` before accepting the file streaming. (Optional: check at controller level prior to saving). |
| `frontend/src/lib/components/ChatMediaDrawer.svelte` | CREATE | New side panel displaying files grouped conditionally by type (Images/Video vs Docs). |

---

## Step-by-Step Tasks

### Task 1: Backend Storage Metrics DB Updates
- **ACTION**: Track storage footprints tightly.
- **IMPLEMENT**: Add `storageUsed` counter to `Chat` model and `fileSize` inside `Message.attachment`. Let `MAX_CHAT_STORAGE = 500 * 1024 * 1024`.

### Task 2: Upload Quota Validation
- **ACTION**: Prevent files exceeding the chat limit.
- **IMPLEMENT**: During the `uploadAttachment` flow, first query `Chat.storageUsed`. If `storageUsed + file.size > MAX_CHAT_STORAGE`, throw a standard `AppError.badRequest`. If valid, update `storageUsed` and save `fileSize` in the subsequent message payload.

### Task 3: Attachment Retrieval Endpoint
- **ACTION**: Provide an endpoint to safely pull historical files.
- **IMPLEMENT**: `GET /api/chat/:chatId/attachments` returning messages from this chat where `attachment.kind` is strictly non-null, sorted newest first.

### Task 4: Delete Attachment Endpoint
- **ACTION**: Allow users to prune attachments.
- **IMPLEMENT**: `DELETE /api/chat/:chatId/attachments/:messageId`. Verifies the user is the sender (or maybe any participant). Decrements `chat.storageUsed` by `message.attachment.fileSize`. Nullifies `message.attachment` and triggers a socket event so clients immediately remove the UI rendering of the media.

### Task 5: Frontend Gallery Drawer & Quota UI
- **ACTION**: Build the media browser interface.
- **IMPLEMENT**: Create `ChatMediaDrawer.svelte`. Fetch attachments and display them via a toggle icon. Include a visual progress bar (e.g., `Storage: 250MB / 500MB`). Add a trash/delete icon next to applicable files. Listen for the new socket deletion event to clear it identically in realtime.

---

## Testing Strategy
- [ ] Attempting to upload a 10MB file when the chat is at 498MB. (Should reject).
- [ ] Deleting an attachment correctly updates the exact `storageUsed` metric mathematically.
- [ ] Socket broadcast ensures the other active user sees the media instantly turn into "Media Deleted" in their open chat bubble.

## Acceptance Criteria
- [ ] Storage is hard-capped to 500MB globally per chat room.
- [ ] The Drawer displays historical files and media effectively.
- [ ] Deleted files correctly rollback storage counters accurately.
