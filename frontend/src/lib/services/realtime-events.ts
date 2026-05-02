type Callback = (data: any) => void;

/**
 * Lightweight event bus for real-time domain events.
 * Decouples the SocketManager (transport) from individual Stores (state).
 */
class RealtimeEvents {
  private listeners = new Map<string, Set<Callback>>();

  /**
   * Subscribe to a domain event.
   * @returns Cleanup function to unsubscribe.
   */
  on(event: string, callback: Callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Emit a domain event with data.
   */
  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[RealtimeEvents] Error in listener for ${event}:`, err);
      }
    });
  }

  /**
   * Domain Event Constants
   */
  static readonly MESSAGE_RECEIVED = "MESSAGE_RECEIVED";
  static readonly MESSAGE_SENT_ACK = "MESSAGE_SENT_ACK";
  static readonly MESSAGE_DELETED = "MESSAGE_DELETED";
  static readonly MESSAGE_UPDATED = "MESSAGE_UPDATED";
  static readonly REACTION_UPDATED = "REACTION_UPDATED";
  static readonly USER_STATUS_UPDATED = "USER_STATUS_UPDATED";
  static readonly USER_STATUS_BATCH = "USER_STATUS_BATCH";
  static readonly TYPING_STARTED = "TYPING_STARTED";
  static readonly TYPING_STOPPED = "TYPING_STOPPED";
  static readonly NOTIFICATION_RECEIVED = "NOTIFICATION_RECEIVED";
  static readonly CHAT_ACCEPTED = "CHAT_ACCEPTED";
  static readonly MESSAGE_ALERT = "MESSAGE_ALERT";
  static readonly PROFILE_UPDATED = "PROFILE_UPDATED";
}

export const realtimeEvents = new RealtimeEvents();
export const RealtimeEvent = RealtimeEvents;
