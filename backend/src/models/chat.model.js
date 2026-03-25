import mongoose, { Schema } from 'mongoose';

const chatSchema = new Schema({
    userA: { type: String, required: true, ref: 'User' },
    userB: { type: String, required: true, ref: 'User' },
    createdBy: { type: String, required: true, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
});

chatSchema.index({ userA: 1, userB: 1 }, { unique: true });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;