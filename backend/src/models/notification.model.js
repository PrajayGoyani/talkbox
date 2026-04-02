import mongoose, { Schema } from 'mongoose';

const notificationSchema = new Schema({
    recipientId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    senderId: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { 
        type: String, 
        enum: ['chat_request', 'request_accepted', 'request_rejected', 'new_message'], 
        required: true 
    },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    message: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Fast pagination query: unread notifications for a user, newest first
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
