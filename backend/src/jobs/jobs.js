import { NODE_ENV } from '../config/env.js';
import ChatModel from '../models/chat.model.js';
import MessageModel from '../models/message.model.js';

async function runRetentionCleanup() {
    try {
        console.log('Running background retention jobs...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        await MessageModel.deleteMany({ createdAt: { $lt: thirtyDaysAgo } });

        // Note: In a real system, messages linked to these chats might also need explicit deletion 
        // if not handled by cascade or lifecycle hooks, but for now we delete chats explicitly.
        const chatsToDelete = await ChatModel.find({
            isDeleted: true,
            deletedAt: { $lt: fourteenDaysAgo }
        });

        for (const chat of chatsToDelete) {
            await MessageModel.deleteMany({ chatId: chat._id }); // can move this to chat model hooks
            await ChatModel.deleteOne({ _id: chat._id });
        }
        console.log('Background jobs complete.');
    } catch (error) {
        console.error('Error during background jobs:', error);
    }
}

export async function startJobs() {
    // Execute immediately on startup
    if (NODE_ENV === 'production') {
        await runRetentionCleanup();
    }

    // Schedule to run every 24 hours
    setInterval(() => {
        runRetentionCleanup().catch(error => {
            console.error('Unhandled background job error:', error);
        });
    }, 24 * 60 * 60 * 1000);
}

// NOTE: future enhancement: node-cron or Agenda(support multiple DBs) or BullMQ (redis based)