import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  contentBody: string;
  attachment: {
    kind: "image" | "audio" | "video" | null;
    url: string | null;
  };
  createdAt: Date;
  idempotencyKey: string;
}

const messageSchema = new Schema<IMessage>({
  chatId: { type: Schema.Types.ObjectId, required: true, ref: "Chat" },
  senderId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  contentBody: { type: String, default: "", trim: true },
  attachment: {
    kind: { type: String, enum: ["image", "audio", "video"], default: null },
    url: { type: String, default: null },
    // metadata: { type: Schema.Types.Mixed, default: null }
  },
  // status: { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  // deliveredAt: { type: Date, default: null },
  // readAt: { type: Date, default: null },
  // isEdited: { type: Boolean, default: false },
  // editedAt: { type: Date, default: null },
  // isDeleted: { type: Boolean, default: false },
  // deletedAt: { type: Date, default: null },
  // sentAt: { type: Date, default: Date.now }, // - can refer to createdAt
  createdAt: { type: Date, default: Date.now },
  idempotencyKey: { type: String, required: true, unique: true },
});

/**
 * QA: for future
 * slack does not maintain delivered receipt (also delete as well)
 * is deleted messages are forever gone in slack?
 */

const Message = mongoose.model<IMessage>("Message", messageSchema);

export default Message;
