import mongoose, { Schema } from 'mongoose';

const chatSchema = new Schema({
    userA: { type: String, required: true, ref: 'User' },
    userB: { type: String, required: true, ref: 'User' },
    createdBy: { type: String, required: true, ref: 'User' },
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'rejected'], 
        default: 'pending' 
    },
    lastMessage: {
        contentBody: { type: String, default: null },
        senderId: { type: String, ref: 'User', default: null },
        sentAt: { type: Date, default: null }
    },
    unreadCounts: {
        type: Map,
        of: Number,
        default: {}
    },
    createdAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null }
});

chatSchema.index({ userA: 1, userB: 1 }, { unique: true });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;