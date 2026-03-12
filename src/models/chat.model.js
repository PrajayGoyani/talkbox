const mongoose = require('mongoose');
const { Schema } = mongoose;

const chatSchema = new Schema({
    reciverId: { type: String, required: true, ref: 'User' },
    cretatedBy: { type: String, required: true, ref: 'User' },
});

const Chat = mongoose.model('Chat', chatSchema);

module.exports = Chat;