import { socketService } from "@services/socket.service";
import { USER_EVENTS, eventBus } from "@utils/event-bus";

/**
 * Initialize event listeners for User actions.
 */
export const initUserEventListeners = () => {
  eventBus.on(USER_EVENTS.PROFILE_UPDATED, async ({ userId, profile }) => {
    // Broadcast update to all partners in real-time
    await socketService.notifyProfileUpdate(userId, profile);
  });

  eventBus.on(USER_EVENTS.PRESENCE_CHANGED, async ({ userId, isOnline }) => {
    const io = socketService.io;
    if (!io) return;

    const payload = {
      userId,
      isOnline,
      lastSeen: isOnline ? null : new Date(),
    };

    // Use room-based broadcasting for instance-wide propagation.
    io.to(`watching:${userId}`).emit("user_status", payload);
  });
};
