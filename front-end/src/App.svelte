<script lang="ts">
  import './app.css';
  import { authStore } from './lib/state/auth.svelte';
  import Login from './lib/components/Login.svelte';
  import Signup from './lib/components/Signup.svelte';

  let view = $state('LOGIN'); // 'LOGIN' | 'SIGNUP' | 'CHAT'
  let chatName = $state("Chat with ALICE");

  // Sync view with auth state
  $effect(() => {
    if (authStore.user) {
      view = 'CHAT';
    } else if (view === 'CHAT') {
      view = 'LOGIN';
    }
  });

  const toggleView = (newView: string) => {
    view = newView;
    authStore.error = null;
  };
</script>

{#if authStore.isCheckingAuth}
  <div class="loading-screen">
    <span class="loader"></span>
  </div>
{:else if view === 'CHAT' && authStore.user}
  <main class="app-container">
    <aside class="sidebar glass-panel">
      <div class="sidebar-header">
        <h2>Messages</h2>
      </div>
      <div class="chat-list">
        <div class="chat-item active">
          <div class="avatar">A</div>
          <div class="chat-preview">
            <h4>ALICE</h4>
            <p>Hey, how is Antigravity going?</p>
          </div>
        </div>
        <div class="chat-item">
          <div class="avatar">B</div>
          <div class="chat-preview">
            <h4>BOB</h4>
            <p>Don't forget the E2EE keys.</p>
          </div>
        </div>
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
        <button class="logout-btn" onclick={() => authStore.logout()} title="Log Out" aria-label="Log out of account">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </aside>

    <section class="chat-area">
      <header class="chat-header glass-panel">
        <h3>{chatName}</h3>
        <div class="status">Online</div>
      </header>
      
      <div class="messages">
        <div class="message msg-receive">
          <div class="bubble">Hey! Have you seen the new UI?</div>
          <span class="time">10:42 AM</span>
        </div>
        <div class="message msg-send">
          <div class="bubble gradient">Yes, it's absolutely stunning! Glassmorphism works perfectly here.</div>
          <span class="time">10:43 AM</span>
        </div>
      </div>
      
      <div class="input-area glass-panel">
        <input type="text" placeholder="Type a message..." aria-label="Message input" />
        <button class="send-btn" aria-label="Send message">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </section>
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
    width: 100vw;
    height: 100vh;
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
    padding: 1.5rem;
    border-bottom: 1px solid var(--glass-border);
  }

  .sidebar-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
  }

  .chat-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem;
  }

  .chat-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border-radius: 12px;
    cursor: pointer;
    transition: var(--transition-fast);
  }

  .chat-item:hover, .chat-item.active {
    background: rgba(255, 255, 255, 0.05);
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

  .chat-preview h4 {
    font-size: 1rem;
    font-weight: 500;
    margin-bottom: 0.2rem;
  }

  .chat-preview p {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
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
  }

  .chat-header {
    padding: 1.25rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--glass-border);
    z-index: 5;
  }

  .chat-header .status {
    font-size: 0.85rem;
    color: #4ade80;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  
  .chat-header .status::before {
    content: '';
    width: 8px;
    height: 8px;
    background: #4ade80;
    border-radius: 50%;
    box-shadow: 0 0 8px #4ade80;
  }

  .messages {
    flex: 1;
    padding: 2rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .message {
    display: flex;
    flex-direction: column;
    max-width: 65%;
  }

  .msg-receive {
    align-self: flex-start;
  }

  .msg-send {
    align-self: flex-end;
  }

  .bubble {
    padding: 1rem 1.25rem;
    border-radius: 20px;
    font-size: 0.95rem;
    line-height: 1.4;
    box-shadow: var(--shadow-md);
  }

  .msg-receive .bubble {
    background: var(--bubble-receiver);
    border-bottom-left-radius: 4px;
  }

  .msg-send .bubble {
    background: var(--bubble-sender);
    border-bottom-right-radius: 4px;
    color: #fff;
  }

  .bubble.gradient {
    background: var(--bubble-sender);
  }

  .time {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 0.4rem;
    margin-left: 0.5rem;
  }
  
  .msg-send .time {
    align-self: flex-end;
    margin-right: 0.5rem;
  }

  .input-area {
    padding: 1.5rem 2rem;
    display: flex;
    gap: 1rem;
    border-top: 1px solid var(--glass-border);
  }

  .input-area input {
    flex: 1;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 30px;
    padding: 1rem 1.5rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 1rem;
    outline: none;
    transition: var(--transition-smooth);
  }

  .input-area input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px var(--color-primary-light);
  }

  .send-btn {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: var(--transition-fast);
    box-shadow: var(--shadow-md);
    flex-shrink: 0;
  }

  .send-btn:hover {
    background: var(--color-primary-hover);
    transform: scale(1.05);
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>

