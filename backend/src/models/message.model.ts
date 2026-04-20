import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  contentBody: string;
  attachment: {
    kind: "image" | "audio" | "video" | null;
    url: string | null;
  };
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  idempotencyKey: string;
  reactions: {
    emoji: string;
    slug: string;
    users: mongoose.Types.ObjectId[];
  }[];
}

const messageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
  senderId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  contentBody: { type: String, default: "", trim: true },
  attachment: {
    kind: { type: String, enum: ["image", "audio", "video"], default: null },
    url: { type: String, default: null },
  },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  idempotencyKey: { type: String, required: true, unique: true },
  reactions: [
    {
      emoji: { type: String, required: true },
      slug: { type: String, default: "" },
      users: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },
  ],
});

messageSchema.index({ chatId: 1, _id: -1 });

/**
 * Future Considerations:
 * - status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' }
 * - deliveredAt: { type: Date }
 * - readAt: { type: Date }
 * - isEdited: { type: Boolean, default: false }
 * - editedAt: { type: Date }
 * - attachment.metadata: { type: Schema.Types.Mixed }
 *
 * QA: for future
 * slack does not maintain delivered receipt (also delete as well)
 * is deleted messages are forever gone in slack?
 */

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
