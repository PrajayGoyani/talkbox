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
  hasMoreMessages = $state(true);
  isLoadingMessages = $state(false);
  activeChatId: string | null = $state(null);

  onlineStatus: Record<string, { isOnline: boolean, lastSeen: Date | null }> = $state({});
  typingStatus: Record<string, Set<string>> = $state({});
  private typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

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
      // Clear typing indicator instantly when a message is received
      if (this.typingStatus[message.chatId]) {
        this.typingStatus[message.chatId].delete(message.senderId);
        // Force reactivity trigger
        this.typingStatus[message.chatId] = new Set(this.typingStatus[message.chatId]);
      }

      // Refresh chat list to update lastMessage preview + unread counts
      if (this.onChatListRefresh) {
        this.onChatListRefresh();
      }
    });

    // Listen for User Presence changes
    this.socket.on('user_status', (data: { userId: string, isOnline: boolean, lastSeen: Date | null }) => {
      this.onlineStatus[data.userId] = {
        isOnline: data.isOnline,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null
      };
      this.onlineStatus = { ...this.onlineStatus }; // Trigger reactivity
    });

    // Listen for Typing Indicators
    this.socket.on('typing_start', (data: { chatId: string, userId: string }) => {
      if (!this.typingStatus[data.chatId]) {
        this.typingStatus[data.chatId] = new Set();
      }
      this.typingStatus[data.chatId].add(data.userId);
      this.typingStatus = { ...this.typingStatus }; // Trigger reactivity

      // Auto-clear after 3.5s just in case typing_stop never arrives
      const key = `${data.chatId}-${data.userId}`;
      if (this.typingTimeouts.has(key)) clearTimeout(this.typingTimeouts.get(key));

      this.typingTimeouts.set(key, setTimeout(() => {
        if (this.typingStatus[data.chatId]) {
          this.typingStatus[data.chatId].delete(data.userId);
          this.typingStatus = { ...this.typingStatus };
        }
      }, 3500));
    });

    this.socket.on('typing_stop', (data: { chatId: string, userId: string }) => {
      if (this.typingStatus[data.chatId]) {
        this.typingStatus[data.chatId].delete(data.userId);
        this.typingStatus = { ...this.typingStatus };
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
    this.hasMoreMessages = true;
    this.isLoadingMessages = true;
    try {
      const resp = await fetch(`${API_BASE}/chat/${chatId}/messages?limit=50`, {
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      if (!resp.ok) return;
      const result = await resp.json();
      const loadedMessages = result.data || result || [];
      this.messages = loadedMessages;
      this.hasMoreMessages = loadedMessages.length === 50;
    } catch (e) {
      console.error('Failed to load messages:', e);
    } finally {
      this.isLoadingMessages = false;
    }
  }

  /** Load older messages using cursor */
  async loadOlderMessages() {
    if (!this.activeChatId || !this.hasMoreMessages || this.isLoadingMessages || this.messages.length === 0) return;

    this.isLoadingMessages = true;
    const oldestMessageId = this.messages[0]._id;

    try {
      const resp = await fetch(`${API_BASE}/chat/${this.activeChatId}/messages?limit=50&cursor=${oldestMessageId}`, {
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      if (!resp.ok) return;
      const result = await resp.json();
      const olderMessages = result.data || result || [];

      if (olderMessages.length > 0) {
        this.messages = [...olderMessages, ...this.messages];
      }
      this.hasMoreMessages = olderMessages.length === 50;
    } catch (e) {
      console.error('Failed to load older messages:', e);
    } finally {
      this.isLoadingMessages = false;
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

    this.emitTyping(chatId, receiverId, false);

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

  // --- Typing Indicator Emitters ---
  private myTypingTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  emitTyping(chatId: string, receiverId: string, isTyping: boolean) {
    if (!this.socket || !this.isConnected) return;

    if (!isTyping) {
      this.socket.emit('typing_stop', { chatId, receiverId });
      return;
    }

    const key = `${chatId}-${receiverId}`;
    if (!this.myTypingTimeouts.has(key)) {
      // Emit immediately if we haven't recently
      this.socket.emit('typing_start', { chatId, receiverId });
    } else {
      clearTimeout(this.myTypingTimeouts.get(key));
    }

    // Debounce to prevent flooding and manage typing_stop
    this.myTypingTimeouts.set(key, setTimeout(() => {
      this.socket?.emit('typing_stop', { chatId, receiverId });
      this.myTypingTimeouts.delete(key);
    }, 2000));
  }
}

export const chatStore = new ChatStore();
