<script lang="ts">
  import { tick } from 'svelte';
  import './app.scss';
  import { authStore } from './lib/state/auth.svelte';
  import { chatStore } from './lib/state/chat.svelte';
  import Login from './lib/components/Login.svelte';
  import Signup from './lib/components/Signup.svelte';
  import ChatList from './lib/components/ChatList.svelte';
  import NotificationsDropdown from './lib/components/NotificationsDropdown.svelte';
  import ToastContainer from './lib/components/ToastContainer.svelte';

  let view = $state('LOGIN'); // 'LOGIN' | 'SIGNUP' | 'CHAT'
  let selectedChatId: string | null = $state(null);
  let selectedOtherUser: any = $state(null);
  let selectedChatStatus: string = $state('');
  let sidebarTab: 'active' | 'pending' = $state('active');
  let messageInput = $state('');
  let messagesContainer: HTMLDivElement | undefined = $state();
  let toastContainer: ToastContainer | undefined = $state();

  const handleSelectChat = (chatId: string, otherUser: any, status: string) => {
    selectedChatId = chatId;
    selectedOtherUser = otherUser;
    selectedChatStatus = status;
    if (status === 'accepted') {
      chatStore.loadMessages(chatId);
      chatStore.markChatRead(chatId);
    }
  };

  // Sync view with auth state
  $effect(() => {
    if (authStore.user) {
      view = 'CHAT';
      chatStore.connect();
      // Register toast callback
      chatStore.onToast((data) => {
        if (toastContainer) {
          toastContainer.addToast(data);
        }
      });
    } else if (view === 'CHAT') {
      view = 'LOGIN';
      chatStore.disconnect();
    }
  });

  // Auto-scroll when messages change
  $effect(() => {
    const _len = chatStore.messages.length;
    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });

  const toggleView = (newView: string) => {
    view = newView;
    authStore.error = null;
  };

  const handleLogout = async () => {
    chatStore.disconnect();
    await authStore.logout();
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId || !selectedOtherUser?.id) return;
    chatStore.sendMessage(selectedChatId, selectedOtherUser.id, messageInput);
    messageInput = '';
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleNotificationNavigate = (type: string, referenceId: string) => {
    if (type === 'chat_request') {
      sidebarTab = 'pending';
    } else if (type === 'request_accepted') {
      sidebarTab = 'active';
    }
    selectedChatId = referenceId;
    selectedChatStatus = type === 'request_accepted' ? 'accepted' : 
                          type === 'chat_request' ? 'pending' : 'accepted';
    if (selectedChatStatus === 'accepted') {
      chatStore.loadMessages(referenceId);
      chatStore.markChatRead(referenceId);
    }
  };

  const handleToastClick = (chatId: string) => {
    // Navigate to the chat from the toast
    sidebarTab = 'active';
    selectedChatId = chatId;
    selectedChatStatus = 'accepted';
    chatStore.loadMessages(chatId);
    chatStore.markChatRead(chatId);
  };
</script>

{#if authStore.isCheckingAuth}
  <div class="loading-screen">
    <span class="loader"></span>
  </div>
{:else if view === 'CHAT' && authStore.user}
  <main class="app-container">
    <!-- Top Navbar -->
    <header class="top-navbar glass-panel">
      <div class="navbar-left">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="navbar-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <span class="navbar-title">ChatApp</span>
      </div>
      <div class="navbar-right">
        <NotificationsDropdown onNavigate={handleNotificationNavigate} />
        <div class="navbar-user">
          <div class="avatar primary small">
            {authStore.user.username[0].toUpperCase()}
          </div>
        </div>
        <button class="logout-btn" onclick={handleLogout} title="Log Out" aria-label="Log out of account">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </header>

    <!-- Body: Sidebar + Chat -->
    <div class="app-body">
    <aside class="sidebar glass-panel">
      <div class="sidebar-header">
        <h2>Messages</h2>
        <div class="sidebar-tabs">
          <button 
            class="tab-btn {sidebarTab === 'active' ? 'active' : ''}" 
            onclick={() => sidebarTab = 'active'}
          >Active</button>
          <button 
            class="tab-btn {sidebarTab === 'pending' ? 'active' : ''}" 
            onclick={() => sidebarTab = 'pending'}
          >Pending</button>
        </div>
      </div>
      <div class="chat-list">
        <ChatList 
          activeChatId={selectedChatId} 
          onSelectChat={handleSelectChat}
          activeTab={sidebarTab}
        />
      </div>

      <div class="sidebar-footer glass-panel">
        <div class="user-info">
          <div class="avatar primary">
            {authStore.user.username[0].toUpperCase()}
          </div>
          <div class="user-details">
            <span class="username">{authStore.user.username}</span>
            <span class="status-dot">Online</span>
          </div>
        </div>
      </div>
    </aside>

    <section class="chat-area {selectedChatId ? '' : 'blank-dashboard'}">
      {#if selectedChatId}
        <div class="chat-header glass-panel">
          <div class="chat-header-info">
            <div class="avatar primary small">
              {selectedOtherUser?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <h3>{selectedOtherUser?.username}</h3>
              {#if selectedChatStatus === 'pending'}
                <span class="status-badge pending">Pending</span>
              {:else}
                <span class="status-badge accepted">Active</span>
              {/if}
            </div>
          </div>
        </div>

        {#if selectedChatStatus === 'pending'}
          <div class="chat-messages">
            <div class="pending-overlay">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <h3>Waiting for response</h3>
              <p>Messages will be available once the request is accepted.</p>
            </div>
          </div>
        {:else}
          <div class="chat-messages" bind:this={messagesContainer}>
            {#if chatStore.messages.length === 0}
              <div class="centered-message text-muted mt-4">
                No messages yet. Send a message to start!
              </div>
            {:else}
              {#each chatStore.messages as msg}
                <div class="message-bubble {msg.senderId === authStore.user?.id ? 'sent' : 'received'}">
                  <p class="message-text">{msg.contentBody}</p>
                  <span class="message-time">{formatTime(msg.createdAt)}</span>
                </div>
              {/each}
            {/if}
          </div>
          <div class="chat-input-area glass-panel">
             <input 
               type="text" 
               placeholder="Type a message..." 
               class="chat-input" 
               bind:value={messageInput}
               onkeydown={handleKeydown}
             />
             <button 
               class="send-btn" 
               aria-label="Send message" 
               onclick={handleSendMessage}
               disabled={!messageInput.trim()}
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
             </button>
          </div>
        {/if}
      {:else}
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <h3>Welcome to your Dashboard</h3>
          <p>Select a conversation from the sidebar or start a new one.</p>
        </div>
      {/if}
    </section>
    </div>
    <ToastContainer bind:this={toastContainer} onToastClick={handleToastClick} />
  </main>
{:else}
  <div class="auth-page">
    {#if view === 'LOGIN'}
      <Login>
        {#snippet toggleSignup()}
          <button class="link-btn" onclick={() => toggleView('SIGNUP')}>
            Sign up
          </button>
        {/snippet}
      </Login>
    {:else}
      <Signup>
        {#snippet toggleLogin()}
          <button class="link-btn" onclick={() => toggleView('LOGIN')}>
            Log in
          </button>
        {/snippet}
      </Signup>
    {/if}
  </div>
{/if}

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100vh;
  }

  /* ─── Top Navbar ─── */
  .top-navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1.5rem;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
    flex-shrink: 0;
    z-index: 100;
  }

  .navbar-left {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .navbar-icon {
    color: var(--color-primary);
  }

  .navbar-title {
    font-size: 1.1rem;
    font-weight: 700;
    letter-spacing: -0.01em;
    color: var(--text-primary);
  }

  .navbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .navbar-user {
    display: flex;
    align-items: center;
  }

  /* ─── App Body (sidebar + chat) ─── */
  .app-body {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .auth-page {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-app);
    padding: 1rem;
  }

  .loading-screen {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-app);
  }

  .loader {
    width: 48px;
    height: 48px;
    border: 3px solid var(--glass-border);
    border-radius: 50%;
    border-top-color: var(--color-primary);
    animation: spin 1s linear infinite;
  }

  .link-btn {
    background: none;
    border: none;
    color: var(--color-primary);
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    font-size: inherit;
    transition: var(--transition-fast);
  }

  .link-btn:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }

  .sidebar {
    width: 320px;
    display: flex;
    flex-direction: column;
    z-index: 10;
  }

  .sidebar-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--glass-border);
  }

  .sidebar-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .sidebar-tabs {
    display: flex;
    gap: 0.5rem;
  }

  .tab-btn {
    flex: 1;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .tab-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .tab-btn:hover:not(.active) {
    background: rgba(255, 255, 255, 0.05);
  }

  .chat-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--bubble-receiver);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 1.1rem;
    box-shadow: var(--shadow-md);
    flex-shrink: 0;
  }

  .avatar.primary {
    background: var(--color-primary);
    color: white;
  }

  .sidebar-footer {
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-details {
    display: flex;
    flex-direction: column;
  }

  .user-details .username {
    font-size: 0.95rem;
    font-weight: 600;
  }

  .user-details .status-dot {
    font-size: 0.75rem;
    color: #4ade80;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .user-details .status-dot::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #4ade80;
    border-radius: 50%;
  }

  .logout-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 8px;
    transition: var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logout-btn:hover {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }

  .chat-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    background: rgba(0, 0, 0, 0.1);
  }

  .chat-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
  }

  .chat-header-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .chat-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .avatar.small {
    width: 36px;
    height: 36px;
    font-size: 0.9rem;
  }

  .status-badge {
    font-size: 0.7rem;
    font-weight: 500;
    padding: 0.1rem 0.5rem;
    border-radius: 20px;
  }

  .status-badge.pending {
    background: rgba(251, 191, 36, 0.15);
    color: #fbbf24;
  }

  .status-badge.accepted {
    background: rgba(74, 222, 128, 0.15);
    color: #4ade80;
  }

  .pending-overlay {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    height: 100%;
    color: var(--text-secondary);
    text-align: center;
    animation: fadeIn 0.5s ease-out;
  }

  .pending-overlay svg {
    color: #fbbf24;
    opacity: 0.7;
  }

  .pending-overlay h3 {
    font-size: 1.3rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .pending-overlay p {
    font-size: 0.9rem;
    max-width: 280px;
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .message-bubble {
    max-width: 70%;
    padding: 0.7rem 1rem;
    border-radius: 16px;
    animation: fadeIn 0.2s ease-out;
    position: relative;
  }

  .message-bubble.sent {
    align-self: flex-end;
    background: var(--color-primary);
    color: white;
    border-bottom-right-radius: 4px;
  }

  .message-bubble.received {
    align-self: flex-start;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
    border-bottom-left-radius: 4px;
  }

  .message-text {
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
    word-break: break-word;
  }

  .message-time {
    display: block;
    font-size: 0.65rem;
    opacity: 0.65;
    margin-top: 0.3rem;
    text-align: right;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .chat-input-area {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--glass-border);
    background: rgba(255, 255, 255, 0.03);
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .chat-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 0.75rem 1.25rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: var(--transition-smooth);
  }

  .chat-input:focus {
    border-color: var(--color-primary);
    background: rgba(0, 0, 0, 0.3);
  }

  .send-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 50%;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .send-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.05);
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mt-4 { margin-top: 1rem; }

  .blank-dashboard {
    justify-content: center;
    align-items: center;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    color: var(--text-secondary);
    text-align: center;
    animation: fadeIn 0.5s ease-out;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--color-primary);
    opacity: 0.8;
    margin-bottom: 0.5rem;
  }

  .empty-state h3 {
    font-size: 1.5rem;
    color: var(--text-primary);
    font-weight: 600;
  }

  .empty-state p {
    font-size: 1rem;
    max-width: 300px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

