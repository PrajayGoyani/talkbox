<script lang="ts">
  import { authStore } from '../state/auth.svelte';
  import { chatStore } from '../state/chat.svelte';
  import { onMount } from 'svelte';
  import { API_BASE } from '../config';

  /** Format a timestamp for chat listing: time if today, 'Yesterday', or date */
  function formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (isYesterday) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  const { activeChatId = null, onSelectChat, activeTab = 'active' } = $props<{ 
    activeChatId?: string | null;
    onSelectChat: (chatId: string, otherUser: any, status: string) => void;
    activeTab?: string;
  }>();

  let chats: Array<any> = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // New chat request
  let showRequestInput = $state(false);
  let requestUsername = $state('');
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);

  export const refreshChats = async () => {
    await fetchChats();
  };

  const fetchChats = async () => {
    loading = true;
    error = null;
    try {
      const resp = await fetch(`${API_BASE}/chat`, {
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        credentials: 'include'
      });
      if (!resp.ok) throw new Error('Failed to load chats');
      const result = await resp.json();
      chats = result.data || [];
    } catch (e) {
      error = (e as Error).message;
    } finally {
      loading = false;
    }
  };

  const handleSendRequest = async () => {
    if (!requestUsername.trim()) return;
    requestLoading = true;
    requestError = null;
    requestSuccess = null;
    try {
      const resp = await fetch(`${API_BASE}/chat/request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.accessToken}`
        },
        credentials: 'include',
        body: JSON.stringify({ username: requestUsername.trim() })
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error?.message || 'Failed to send request');
      requestSuccess = `Request sent to ${requestUsername}!`;
      requestUsername = '';
      showRequestInput = false;
      await fetchChats();
    } catch (e) {
      requestError = (e as Error).message;
    } finally {
      requestLoading = false;
    }
  };

  const handleAccept = async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/accept`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      await fetchChats();
    } catch (e) { console.error(e); }
  };

  const handleReject = async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      await fetchChats();
    } catch (e) { console.error(e); }
  };

  // Filter chats based on active tab
  const filteredChats = $derived(
    chats.filter(chat => {
      if (activeTab === 'active') return chat.status === 'accepted';
      if (activeTab === 'pending') return chat.status === 'pending';
      return true;
    })
  );

  // Initial load + register for socket-driven refreshes
  onMount(() => {
    fetchChats();
    chatStore.onRefreshChats(() => fetchChats());
  });
</script>

<div class="chat-list-container">
  <!-- New Chat Request Button -->
  <div class="new-chat-section">
    {#if showRequestInput}
      <div class="request-input-row">
        <input 
          type="text" 
          placeholder="Enter username..." 
          bind:value={requestUsername}
          class="request-input"
          onkeydown={(e) => e.key === 'Enter' && handleSendRequest()}
        />
        <button 
          class="request-send-btn" 
          onclick={handleSendRequest} 
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send chat request"
        >
          {#if requestLoading}
            <span class="loader tiny"></span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          {/if}
        </button>
        <button class="request-cancel-btn" onclick={() => { showRequestInput = false; requestError = null; }} aria-label="Cancel">
          ✕
        </button>
      </div>
      {#if requestError}
        <span class="inline-error">{requestError}</span>
      {/if}
    {:else}
      <button class="new-chat-btn" onclick={() => showRequestInput = true}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        New Chat
      </button>
    {/if}
    {#if requestSuccess}
      <span class="inline-success">{requestSuccess}</span>
    {/if}
  </div>

  <!-- Chat Items -->
  {#if loading}
    <div class="centered-message">
      <span class="loader small"></span>
    </div>
  {:else if error}
    <div class="centered-message error">{error}</div>
  {:else if filteredChats.length === 0}
    <div class="centered-message text-muted">
      {activeTab === 'pending' ? 'No pending requests' : 'No conversations yet'}
    </div>
  {:else}
    {#each filteredChats as chat}
      {@const displayName = chat.otherUser.name || chat.otherUser.username}
      <div class="chat-item-wrapper">
        <button 
          class="chat-item {activeChatId === chat.id ? 'active' : ''}"
          onclick={() => onSelectChat(chat.id, chat.otherUser, chat.status)}
          title="@{chat.otherUser.username}"
        >
          <div class="avatar receiver">
            {displayName[0].toUpperCase()}
          </div>
          <div class="chat-info">
            <div class="chat-name-row">
              <span class="chat-name">{displayName}</span>
              {#if chat.lastMessage?.sentAt}
                <span class="chat-time">{formatTime(chat.lastMessage.sentAt)}</span>
              {/if}
            </div>
            {#if chat.status === 'pending'}
              <span class="chat-preview pending-label">
                {chat.createdBy === authStore.user?.id ? 'Request sent' : 'Incoming request'}
              </span>
            {:else if chat.lastMessage}
              <span class="chat-preview">
                {chat.lastMessage.contentBody.length > 35 
                  ? chat.lastMessage.contentBody.substring(0, 35) + '...' 
                  : chat.lastMessage.contentBody}
              </span>
            {:else}
              <span class="chat-preview">No messages yet</span>
            {/if}
          </div>
          {#if chat.unreadCount > 0}
            <span class="unread-badge">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
          {/if}
        </button>
        
        <!-- Accept/Reject for incoming pending requests -->
        {#if chat.status === 'pending' && chat.createdBy !== authStore.user?.id}
          <div class="request-actions">
            <button class="action-btn accept" onclick={() => handleAccept(chat.id)} aria-label="Accept request">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button class="action-btn reject" onclick={() => handleReject(chat.id)} aria-label="Reject request">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<style>
  .chat-list-container {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    height: 100%;
    padding: 0.5rem;
  }

  .new-chat-section {
    margin-bottom: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .new-chat-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.6rem;
    border: 1px dashed var(--glass-border);
    border-radius: 12px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    transition: var(--transition-fast);
  }

  .new-chat-btn:hover {
    background: rgba(99, 102, 241, 0.1);
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  .request-input-row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
  }

  .request-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
    transition: var(--transition-smooth);
  }

  .request-input:focus {
    border-color: var(--color-primary);
  }

  .request-send-btn, .request-cancel-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0.4rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: var(--transition-fast);
  }

  .request-send-btn:hover { color: var(--color-primary); }
  .request-cancel-btn:hover { color: #f87171; }
  .request-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .inline-error {
    color: #f87171;
    font-size: 0.78rem;
    margin-left: 0.25rem;
  }

  .inline-success {
    color: #4ade80;
    font-size: 0.78rem;
    margin-left: 0.25rem;
    animation: fadeIn 0.3s ease-out;
  }

  .centered-message {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100px;
    font-size: 0.9rem;
  }

  .text-muted { color: var(--text-muted); }
  .error { color: #f87171; }

  .loader.small {
    width: 24px;
    height: 24px;
    border: 2px solid var(--glass-border);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  .loader.tiny {
    width: 14px;
    height: 14px;
    border: 2px solid var(--glass-border);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  .chat-item-wrapper {
    position: relative;
  }

  .chat-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: none;
    background: transparent;
    border-radius: 12px;
    cursor: pointer;
    transition: var(--transition-fast);
    text-align: left;
    width: 100%;
    color: var(--text-primary);
  }

  .chat-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .chat-item.active {
    background: rgba(99, 102, 241, 0.15);
    border-left: 3px solid var(--color-primary);
  }

  .avatar.receiver {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.1rem;
    flex-shrink: 0;
    background: var(--bubble-receiver, #334155);
    color: white;
  }

  .chat-info {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .chat-name-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }

  .chat-name {
    font-weight: 600;
    font-size: 0.95rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chat-time {
    font-size: 0.7rem;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .chat-preview {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .pending-label {
    color: #fbbf24;
    font-style: italic;
  }

  .unread-badge {
    background: var(--color-primary);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    min-width: 20px;
    height: 20px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    flex-shrink: 0;
    line-height: 1;
    animation: badgePop 0.3s ease-out;
  }

  @keyframes badgePop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }

  .request-actions {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 0.4rem;
  }

  .action-btn {
    width: 30px;
    height: 30px;
    border: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .action-btn.accept {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .action-btn.accept:hover {
    background: rgba(74, 222, 128, 0.3);
  }
  
  .action-btn.reject {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }

  .action-btn.reject:hover {
    background: rgba(248, 113, 113, 0.3);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
