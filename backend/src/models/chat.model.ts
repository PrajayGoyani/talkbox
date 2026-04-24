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
});

// Indices for listing chats for a user
chatSchema.index({ participants: 1, isDeleted: 1, status: 1 });

// Unique index to prevent duplicate 1-to-1 chats.
// We use userA and userB as "shadow fields" for indexing to ensure
// combination uniqueness. This handles the transition and legacy data safely.
chatSchema.index(
  { userA: 1, userB: 1 },
  {
    unique: true,
    partialFilterExpression: { isGroup: false, isDeleted: false },
  },
);


chatSchema.index({ "lastMessage.sentAt": -1, createdAt: -1, _id: -1 });

const Chat = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;
