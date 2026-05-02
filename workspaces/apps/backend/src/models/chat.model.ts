import mongoose, { Document, Model, Schema } from "mongoose";

export interface IChat extends Document {
  /** @deprecated Use participants instead */
  userA: mongoose.Types.ObjectId;
  /** @deprecated Use participants instead */
  userB: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  isGroup: boolean;
  createdBy: mongoose.Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  lastMessage: {
    contentBody: string | null;
    senderId: mongoose.Types.ObjectId | null;
    sentAt: Date | null;
  };
  unreadCounts: Map<string, number>;
  createdAt: Date;
  isDeleted: boolean;
  deletedAt: Date | null;
  /** Denormalized flag for retention job optimization */
  isFreeTierOnly: boolean;
}

export interface IChatModel extends Model<IChat> {}

const chatSchema = new Schema<IChat>({
  userA: { type: Schema.Types.ObjectId, ref: "User" },
  userB: { type: Schema.Types.ObjectId, ref: "User" },
  participants: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
    required: true,
  },
  isGroup: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  lastMessage: {
    contentBody: { type: String, default: null },
    senderId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    sentAt: { type: Date, default: null },
  },
  unreadCounts: {
    type: Map,
    of: Number,
    default: {},
  },
  createdAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  isFreeTierOnly: { type: Boolean, default: true },
});

// Consolidated "Super Index" for chat listing, requests, and pagination.
// This allows MongoDB to satisfy both the filter (participants, isDeleted, status)
// and the sort (lastMessage.sentAt) in a single index scan.
chatSchema.index({ participants: 1, isDeleted: 1, status: 1, "lastMessage.sentAt": -1 });

// Index for user upgrade sync (when transitioning from Free to Pro)
chatSchema.index({ participants: 1, isFreeTierOnly: 1, isDeleted: 1 });

// Unique index to prevent duplicate 1-to-1 chats for specific user pairs.
chatSchema.index(
  { userA: 1, userB: 1 },
  {
    unique: true,
    partialFilterExpression: { isGroup: false, isDeleted: false },
  },
);

// Retention & cleanup optimization indices (Global background jobs)
chatSchema.index({ isFreeTierOnly: 1, isDeleted: 1 });
chatSchema.index({ isDeleted: 1, deletedAt: 1 }, { partialFilterExpression: { isDeleted: true } });

const Chat = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;
