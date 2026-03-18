import mongoose, { Schema } from 'mongoose';

const chatSchema = new Schema({
    reciverId: { type: String, required: true, ref: 'User' },
    cretatedBy: { type: String, required: true, ref: 'User' },
});

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;