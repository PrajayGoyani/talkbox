import { io, type Socket } from 'socket.io-client';
import { authStore } from './auth.svelte';
import { API_ROOT, API_BASE } from '../config';

interface MessageAlert {
  chatId: string;
  senderId: string;
  senderName?: string | null;
  senderUsername: string;
  preview: string;
}

class ChatStore {
  socket: Socket | null = $state(null);
  isConnected = $state(false);
  messages: Array<any> = $state([]);
  activeChatId: string | null = $state(null);

  // Callbacks for UI refresh
  private onChatListRefresh: (() => void) | null = null;
  private onToastCallback: ((data: MessageAlert) => void) | null = null;

  /** Register a callback that gets called when chats should be refreshed */
  onRefreshChats(cb: () => void) {
    this.onChatListRefresh = cb;
  }

  /** Register a callback for toast notifications */
  onToast(cb: (data: MessageAlert) => void) {
    this.onToastCallback = cb;
  }

  connect() {
    if (this.socket || !authStore.accessToken) return;
    
    this.socket = io(API_ROOT, {
      auth: { token: authStore.accessToken },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Listen for incoming messages
    this.socket.on('receive_message', (message: any) => {
      if (message.chatId === this.activeChatId) {
        this.messages = [...this.messages, message];
      }
      // Refresh chat list to update lastMessage preview + unread counts
      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });

    // Listen for message alerts (toast / browser notification)
    this.socket.on('message_alert', (data: MessageAlert) => {
      const isChatOpen = data.chatId === this.activeChatId;
      const isTabFocused = document.hasFocus();

      if (isChatOpen && isTabFocused) {
        // Message is already visible on screen — do nothing
        // Also auto-mark as read since user is viewing
        this.markChatRead(data.chatId);
        return;
      }

      if (!isTabFocused) {
        // Tab not focused — show browser notification
        this.showBrowserNotification(data);
      } else {
        // Tab focused but different chat — show in-app toast
        if (this.onToastCallback) {
          this.onToastCallback(data);
        }
      }
    });

    // When a chat request or acceptance arrives, refresh the chat list
    this.socket.on('notification', (_notification: any) => {
      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });

    this.socket.on('chat_accepted', (_data: any) => {
      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });
  }

  /** Show browser-level notification when tab is not focused */
  private showBrowserNotification(data: MessageAlert) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const displayName = data.senderName || data.senderUsername;

    const notification = new Notification(displayName, {
      body: data.preview,
      icon: '/vite.svg',
      tag: `msg-${data.chatId}-${Date.now()}`,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    this.messages = [];
    this.activeChatId = null;
  }

  /** Load messages for a chat via REST */
  async loadMessages(chatId: string) {
    this.activeChatId = chatId;
    this.messages = [];
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      if (!resp.ok) return;
      const result = await resp.json();
      this.messages = result.data || result || [];
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }

  /** Mark a chat as read via REST */
  async markChatRead(chatId: string) {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      // Refresh chat list to update unread counts
      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    } catch (e) {
      console.error('Failed to mark chat as read:', e);
    }
  }

  /** Send a message via socket with idempotency */
  sendMessage(chatId: string, receiverId: string, contentBody: string) {
    if (!this.socket || !contentBody.trim()) return;

    const idempotencyKey = `${authStore.user?.id}_${chatId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    this.socket.emit('send_message', {
      chatId,
      receiverId,
      contentBody: contentBody.trim(),
      idempotencyKey
    }, (ack: any) => {
      if (ack?.status === 'ok' && ack.message) {
        // Add our own sent message to the list (avoid duplicates)
        const exists = this.messages.some((m: any) => m.idempotencyKey === ack.message.idempotencyKey);
        if (!exists) {
          this.messages = [...this.messages, ack.message];
        }
        // Refresh chat list to show this as last message
        if (this.onChatListRefresh) {
          this.onChatListRefresh();
        }
      }
    });
  }
}

export const chatStore = new ChatStore();
