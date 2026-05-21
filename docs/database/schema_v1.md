# Schema Draft

## User

- id (String): Unique identifier for the user.
- name (String): Name of the user.
- email (String): Email address of the user.
- password (String): Password of the user.
- createdAt (Date): Timestamp when the user was created.
- updatedAt (Date): Timestamp when the user was last updated.

## Chat

- id (String): Unique identifier for the chat.
- participants (Array): Array of user IDs representing the participants in the chat.
- participantKey (String): Unique key for the chat, sorted by participant IDs.
- participantMeta (Array): Array of objects representing metadata for each participant in the chat.
- lastMessage (Object): Object representing the last message in the chat.
- lastActivityAt (Date): Timestamp when the chat was last active.

## Message

- id (String): Unique identifier for the message.
- conversation (String): ID of the conversation the message belongs to.
- sender (String): ID of the user who sent the message.
- type (String): Type of the message (e.g. text, attachment).
- text (String): Text content of the message.
- attachments (Array): Array of objects representing attachments in the message.
- createdAt (Date): Timestamp when the message was created.
- updatedAt (Date): Timestamp when the message was last updated.

===============

<!--
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatarUrl: String,
  // other profile fields...
});
-->

<!--
// Chat
const chatSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }], // length 2
  participantKey: { type: String, required: true, unique: true }, // sorted "id1:id2"
  // metadata per participant (keep order-independent, look up by user id)
  participantMeta: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    unreadCount: { type: Number, default: 0 },
    lastReadAt: Date
  }],
  // denormalized last message for chat list
  lastMessage: {
    _id: mongoose.Schema.Types.ObjectId,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: Date
  },
  lastActivityAt: { type: Date, default: Date.now }
});
chatSchema.index({ participants: 1 });
-->

<!--
const AttachmentSchema = new mongoose.Schema({
  kind: { type: String, enum: ['image','audio','video','file'], required: true },
  url: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed } // e.g. { mimeType, durationSec, width, height, size, thumbnailUrl }
}, { _id: false });

const MessageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text','attachment'], default: 'text' },
  text: { type: String },
  attachments: { type: [AttachmentSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});
MessageSchema.index({ conversation: 1, createdAt: -1 });
-->
