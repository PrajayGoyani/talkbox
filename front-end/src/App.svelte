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
        <!-- Conversations will appear here -->
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

    <section class="chat-area blank-dashboard">
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        <h3>Welcome to your Dashboard</h3>
        <p>Select a conversation from the sidebar or start a new one.</p>
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
  }

  .blank-dashboard {
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.1);
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

