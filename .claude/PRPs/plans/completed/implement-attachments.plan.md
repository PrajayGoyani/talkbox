# Plan: Implement Attachments

## Summary
Add support for sending images, videos, audio, and general documents as chat attachments. We will support local and S3 storage mechanisms dynamically via configurations, and relax the file type limitations for uploads. Users will be able to upload a file up to 10MB, which will be processed via an API endpoint that returns a URL before attaching it to a standard socket message payload.

## User Story
As a user, I want to send attachments (images, PDFs, documents) in my chats, so that I can easily share files with my contacts.

## Problem → Solution
Users can only send text messages → Users can select files, upload them, and send them as rich messages with attachments to the receiver.

## Metadata
- **Complexity**: Medium
- **Source PRD**: N/A
- **PRD Phase**: N/A
- **Estimated Files**: 5

---

## UX Design

### Before
```
┌─────────────────────────────┐
│  [Current Input Box]        │
│  [ Input field...... ] [>]  │
└─────────────────────────────┘
```

### After
```
┌─────────────────────────────┐
│  [New Input Box]            │
│  [+] [ Input field.. ] [>]  │
└─────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Input Area | Just text input | Added '+' an attachment paperclip icon | Clicking icon opens native file picker. |
| Message Flow | Sends plain text | Uploads file first (shows loading/progress), then sends message with attachment URL | Shows a preview for images or generic icon for files. |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `backend/src/middlewares/upload.middleware.ts` | 1-64 | Core upload logic and existing limits to modify for S3 + Docs. |
| P0 | `frontend/src/lib/state/chat.svelte.ts` | 492-537 | Socket `sendMessage` flow to attach the new payload. |
| P1 | `backend/src/models/message.model.ts` | 1-35 | Modifying schema `kind` enum to support general documents and tracking file name. |

---

## Patterns to Mirror

### Naming Convention
```typescript
// SOURCE: backend/src/controllers/chat.controller.ts:41
export const getChatMessages = async (req: Request, res: Response) => { ... }
```

### Error Handling
```typescript
// SOURCE: backend/src/services/chat.service.ts:188
if (!targetUser) {
  throw AppError.notFound("User", "USER_NOT_FOUND");
}
```

### Upload Configuration
```typescript
// SOURCE: backend/src/middlewares/upload.middleware.ts:49
const useCloudinary = process.env.UPLOAD_STRATEGY === "cloudinary";
// Will change to support S3.
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `backend/src/middlewares/upload.middleware.ts` | UPDATE | Allow document file types and configure multer-s3 based on `UPLOAD_STRATEGY`. Change limit to 10MB. |
| `backend/src/models/message.model.ts` | UPDATE | Add `document` and `file` to attachment kind enum, add `originalName`. |
| `backend/src/routes/chat.routes.ts` | UPDATE | Add `POST /:chatId/attachment` upload endpoint. |
| `backend/src/controllers/chat.controller.ts` | UPDATE | Add controller explicitly handling `uploadAttachment`. |
| `frontend/src/lib/types/chat.dto.ts` | UPDATE | Extend `RawMessageDto` with attachment interface. |
| `frontend/src/lib/state/chat.svelte.ts` | UPDATE | Support `attachment` payload on socket mapping functions. Add utility to upload first. |
| `frontend/src/lib/components/ChatWindow.svelte` | UPDATE | UI to select files, display uploads and render standard previews per type. |

## NOT Building
- Pinned messages
- Reactions
- Multiple attachments strictly inside one distinct payload (we default to 1 file per message for simplicity based on DB schema).

---

## Step-by-Step Tasks

### Task 1: Backend Infrastructure & Adapter Upload Config
- **ACTION**: Set up adapter-based upload strategy (S3, Cloudinary, Local).
- **IMPLEMENT**: Define a common constant `MAX_FILE_SIZE = 10 * 1024 * 1024` (10MB). Add `multer-s3` and `@aws-sdk/client-s3`. Modify `upload.middleware.ts` to implement an adapter-based pattern handling `UPLOAD_STRATEGY` mappings (s3, cloudinary, local) to the respective multer storage engine. Change filters to allow PDFs, audio, video, and docs.
- **MIRROR**: Follow existing `cloudinaryStorage` patterns but abstract into an adapter factory.
- **IMPORTS**: `import { S3Client } from '@aws-sdk/client-s3'; import multerS3 from 'multer-s3';`
- **VALIDATE**: `pnpm run dev` in backend to ensure compilation works.

### Task 2: Message DB Schema Update
- **ACTION**: Modify MongoDB Schema for Messages.
- **IMPLEMENT**: Change `enum: ["image", "audio", "video"]` to `enum: ["image", "audio", "video", "document"]`. Add `originalName: { type: String }` in `attachment` object.
- **MIRROR**: `backend/src/models/message.model.ts` schema definition patterns.
- **IMPORTS**: N/A
- **VALIDATE**: Restart server dynamically to see if types build.

### Task 3: Setup `/attachment` Endpoint
- **ACTION**: Export new file-upload endpoint in routes and controller.
- **IMPLEMENT**: Controller method `uploadAttachment` that accepts `req.file`, extracts `url` (and `originalname`), and returns it to the client. Needs to verify `chatId` via `chatService` but simply acts as a dumb store/return mechanism. Attach `upload.single('file')` middleware.
- **MIRROR**: `backend/src/routes/chat.routes.ts` structure.
- **IMPORTS**: `upload` from `middlewares/upload.middleware.ts`.
- **VALIDATE**: Use terminal cURL or start Postman to verify upload endpoint responds successfully for a local file.

### Task 4: Frontend DTO & Store Adjustment
- **ACTION**: Update `RawMessageDto` and `ChatStore.sendMessage` payload.
- **IMPLEMENT**: Allow optional `{ kind: string, url: string, originalName: string }` attachment. Add standard fetch logic inside `ChatWindow.svelte` for uploading before emitting.
- **MIRROR**: Uses existing `API_BASE` fetch mechanics from `frontend/src/lib/state/chat.svelte.ts`.
- **IMPORTS**: N/A
- **VALIDATE**: `pnpm run dev` in frontend, no type errors.

### Task 5: Frontend UI Changes
- **ACTION**: Add attach UI button, chat bubble rendering, and media overlays.
- **IMPLEMENT**: Add `<input type="file" hidden>` triggered by icon next to chat box. When selected, automatically uploads to API, retrieves URL, then triggers `chatStore.sendMessage`. 
  - **Images**: Render thumbnail. Clicking opens a large fullscreen overlay popup for big view.
  - **Videos**: Render a thumbnail. Clicking the thumbnail opens a large video overlay popup.
  - **Audio**: Inline `<audio>` controls.
  - **Documents**: Clickable file card.
- **MIRROR**: Component styling from `ChatWindow.svelte`. Custom overlay modal styling.
- **IMPORTS**: N/A
- **GOTCHA**: Must handle loading states elegantly without breaking flow. 
- **VALIDATE**: Ensure UI looks exactly like current sleek standards, displaying overlays successfully.

---

## Testing Strategy

### Unit Tests
Skipped (integration preferred).

### Edge Cases Checklist
- [ ] Empty files (0 bytes) rejected?
- [ ] 10.1 MB files rejected properly?
- [ ] Attempting to upload to a corrupted/non-existent `chatId`?
- [ ] Concurrent uploads?
- [ ] Missing S3 credentials fallback validation.

## Validation Commands

### Static Analysis
```bash
# Backend
cd backend && pnpm tc
# Frontend
cd frontend && pnpm check
```
EXPECT: Zero type errors

### Browser Validation
Open browser and test attachments. File picker -> select image -> visually uploads -> preview in chat window.

EXPECT: Feature works as designed

## Acceptance Criteria
- [ ] All tasks completed
- [ ] Server validates `s3` config or `local`
- [ ] File limit 10MB works
- [ ] Image/Documents attach fully via standard socket event
- [ ] Renders successfully inline on both devices.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CORS preventing upload | Low | High | Ensure multipart/form-data works with the existing global cors config |
| S3 API missing | Med | Med | Throw clean log warnings if credentials miss on boot |
