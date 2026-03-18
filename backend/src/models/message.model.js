import mongoose, { Schema } from 'mongoose';

const messageSchema = new Schema({
    chatId: { type: String, required: true, ref: 'Chat' },
    senderId: { type: String, required: true, ref: 'User' },
    contentBody: { type: String, default: '', trim: true },
    attachement: {
        kind: { type: String, enum: ['image', 'audio', 'video'], default: null },
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
});

const Message = mongoose.model('Message', messageSchema);

export default Message;