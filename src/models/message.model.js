const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
    chatId: { type: String, required: true, ref: 'Chat' },
    senderId: { type: String, required: true, ref: 'User' },
    contentBody: { type: String, default: '', trim: true },
    attachement: {
        kind: { type: String, enum: ['image', 'audio', 'video'], default: null },
        url: { type: String, default: null }
    }
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;