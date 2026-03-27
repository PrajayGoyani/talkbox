import mongoose from 'mongoose';
import { MONGO_URI } from './env.js';
import { chatLockdownService } from '../services/chat-lockdown.service.js';

export async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        await chatLockdownService.hydrate();
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}