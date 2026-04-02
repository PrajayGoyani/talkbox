<script lang="ts">
  import { authStore } from '../state/auth.svelte';
  import { chatStore } from '../state/chat.svelte';
  import { onMount } from 'svelte';
  import { API_BASE } from '../config';

  let pendingChats: Array<any> = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // New chat request
  let requestUsername = $state('');
  let requestLoading = $state(false);
  let requestError = $state<string | null>(null);
  let requestSuccess = $state<string | null>(null);

  export const refreshRequests = async () => {
    await fetchPendingChats();
  };

  const fetchPendingChats = async () => {
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
      const allChats = result.data || [];
      pendingChats = allChats.filter((c: any) => c.status === 'pending');
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
      await fetchPendingChats();
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
      await fetchPendingChats();
    } catch (e) { console.error(e); }
  };

  const handleReject = async (chatId: string) => {
    try {
      await fetch(`${API_BASE}/chat/${chatId}/reject`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${authStore.accessToken}` },
        credentials: 'include'
      });
      await fetchPendingChats();
    } catch (e) { console.error(e); }
  };

  const incomingRequests = $derived(
    pendingChats.filter(c => c.createdBy !== authStore.user?.id)
  );
  const outgoingRequests = $derived(
    pendingChats.filter(c => c.createdBy === authStore.user?.id)
  );

  onMount(() => {
    fetchPendingChats();
    chatStore.onRefreshChats(() => fetchPendingChats());
  });
</script>

<div class="requests-panel">
  <div class="panel-header">
    <h2>Chat Requests</h2>
  </div>

  <div class="requests-content">
    <!-- New Chat Request -->
    <div class="new-request-section">
      <label class="section-label">Send a chat request</label>
      <div class="request-input-row">
        <input
          type="text"
          placeholder="Enter username..."
          bind:value={requestUsername}
          class="request-input"
          onkeydown={(e) => e.key === 'Enter' && handleSendRequest()}
        />
        <button
          class="send-btn"
          onclick={handleSendRequest}
          disabled={requestLoading || !requestUsername.trim()}
          aria-label="Send request"
        >
          {#if requestLoading}
            <span class="loader tiny"></span>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          {/if}
        </button>
      </div>
      {#if requestError}
        <span class="inline-error">{requestError}</span>
      {/if}
      {#if requestSuccess}
        <span class="inline-success">{requestSuccess}</span>
      {/if}
    </div>

    <hr class="divider" />

    <!-- Incoming Requests -->
    <div class="section">
      <label class="section-label">
        Incoming
        {#if incomingRequests.length > 0}
          <span class="count-badge">{incomingRequests.length}</span>
        {/if}
      </label>
      {#if loading}
        <div class="centered-message"><span class="loader small"></span></div>
      {:else if incomingRequests.length === 0}
        <div class="empty-message">No incoming requests</div>
      {:else}
        {#each incomingRequests as chat}
          {@const displayName = chat.otherUser.name || chat.otherUser.username}
          <div class="request-item">
            <div class="request-user">
              <div class="request-avatar">{displayName[0].toUpperCase()}</div>
              <div class="request-info">
                <span class="request-name" title="@{chat.otherUser.username}">{displayName}</span>
                <span class="request-meta">Wants to connect</span>
              </div>
            </div>
            <div class="request-actions">
              <button class="action-btn accept" onclick={() => handleAccept(chat.id)} aria-label="Accept">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
              <button class="action-btn reject" onclick={() => handleReject(chat.id)} aria-label="Reject">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Outgoing Requests -->
    <div class="section">
      <label class="section-label">Sent</label>
      {#if outgoingRequests.length === 0 && !loading}
        <div class="empty-message">No pending sent requests</div>
      {:else}
        {#each outgoingRequests as chat}
          {@const displayName = chat.otherUser.name || chat.otherUser.username}
          <div class="request-item">
            <div class="request-user">
              <div class="request-avatar sent">{displayName[0].toUpperCase()}</div>
              <div class="request-info">
                <span class="request-name" title="@{chat.otherUser.username}">{displayName}</span>
                <span class="request-meta">Waiting for response...</span>
              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .requests-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .panel-header {
    padding: 1.25rem 1.25rem;
    border-bottom: 1px solid var(--glass-border);
  }

  .panel-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }

  .requests-content {
    padding: 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .new-request-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .count-badge {
    background: var(--color-primary);
    color: white;
    font-size: 0.6rem;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
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
    padding: 0.55rem 0.75rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.85rem;
    outline: none;
    transition: border-color var(--transition-fast);
  }

  .request-input:focus {
    border-color: var(--color-primary);
  }

  .send-btn {
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .inline-error { color: #f87171; font-size: 0.78rem; }
  .inline-success { color: #4ade80; font-size: 0.78rem; animation: fadeIn 0.3s; }

  .divider {
    border: none;
    border-top: 1px solid var(--glass-border);
    margin: 0.25rem 0;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .empty-message {
    font-size: 0.8rem;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }

  .request-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem;
    border-radius: 10px;
    transition: background var(--transition-fast);
  }

  .request-item:hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .request-user {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex: 1;
    min-width: 0;
  }

  .request-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .request-avatar.sent {
    background: var(--bubble-receiver);
  }

  .request-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .request-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .request-meta {
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .request-actions {
    display: flex;
    gap: 0.35rem;
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
    transition: all var(--transition-fast);
  }

  .action-btn.accept {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .action-btn.accept:hover { background: rgba(74, 222, 128, 0.3); }

  .action-btn.reject {
    background: rgba(248, 113, 113, 0.15);
    color: #f87171;
  }

  .action-btn.reject:hover { background: rgba(248, 113, 113, 0.3); }

  .centered-message {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }

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
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
