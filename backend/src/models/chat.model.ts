import mongoose, { Schema, Document } from "mongoose";

export interface IChat extends Document {
  userA: mongoose.Types.ObjectId;
  userB: mongoose.Types.ObjectId;
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

const chatSchema = new Schema<IChat>({
  userA: { type: Schema.Types.ObjectId, required: true, ref: "User" },
  userB: { type: Schema.Types.ObjectId, required: true, ref: "User" },
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

chatSchema.index({ userA: 1, isDeleted: 1, status: 1 });
chatSchema.index({ userB: 1, isDeleted: 1, status: 1 });
chatSchema.index({ userA: 1, userB: 1 }, { unique: true });

const Chat = mongoose.model<IChat>("Chat", chatSchema);

export default Chat;
