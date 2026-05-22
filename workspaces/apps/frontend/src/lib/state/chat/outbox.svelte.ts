import { socketManager } from "$services/socket.manager.svelte";

export interface OutboxItem {
  idempotencyKey: string;
  chatId: string;
  receiverId: string;
  contentBody: string;
  timestamp: number;
}

class OutboxStore {
  queue = $state<OutboxItem[]>([]);

  constructor() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("talkbox_outbox_queue");
      if (stored) {
        try {
          this.queue = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored outbox queue:", e);
        }
      }
    }
  }

  add(chatId: string, receiverId: string, contentBody: string): string {
    const key = crypto.randomUUID();
    this.queue = [
      ...this.queue,
      {
        idempotencyKey: key,
        chatId,
        receiverId,
        contentBody,
        timestamp: Date.now(),
      },
    ];
    this.persist();
    return key;
  }

  remove(idempotencyKey: string) {
    this.queue = this.queue.filter((item) => item.idempotencyKey !== idempotencyKey);
    this.persist();
  }

  private persist() {
    if (typeof window !== "undefined") {
      localStorage.setItem("talkbox_outbox_queue", JSON.stringify(this.queue));
    }
  }

  drainQueue() {
    if (this.queue.length === 0 || !socketManager.isConnected) return;

    const items = [...this.queue];
    items.forEach((item) => {
      socketManager.socket?.emit(
        "send_message",
        {
          chatId: item.chatId,
          receiverId: item.receiverId,
          contentBody: item.contentBody,
          idempotencyKey: item.idempotencyKey,
        },
        (ack: any) => {
          if (ack?.status === "ok") {
            this.remove(item.idempotencyKey);
          }
        },
      );
    });
  }
}

export const outboxStore = new OutboxStore();
