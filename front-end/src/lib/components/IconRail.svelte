<script lang="ts">
  import { authStore } from '../state/auth.svelte';

  type PanelId = 'conversations' | 'profile' | 'settings' | 'requests';

  const { activePanel, onPanelSelect, onNotificationToggle, notificationCount = 0, onLogout } = $props<{
    activePanel: PanelId;
    onPanelSelect: (panel: PanelId) => void;
    onNotificationToggle: () => void;
    notificationCount?: number;
    onLogout: () => void;
  }>();

  const displayName = $derived(authStore.user?.name || authStore.user?.username || '?');
</script>

<nav class="icon-rail">
  <div class="rail-top">
    <!-- App Logo -->
    <div class="rail-logo">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>

    <!-- Navigation Icons -->
    <button
      class="rail-btn {activePanel === 'conversations' ? 'active' : ''}"
      onclick={() => onPanelSelect('conversations')}
      title="Conversations"
      aria-label="Conversations"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'profile' ? 'active' : ''}"
      onclick={() => onPanelSelect('profile')}
      title="Profile"
      aria-label="Profile"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'settings' ? 'active' : ''}"
      onclick={() => onPanelSelect('settings')}
      title="Settings"
      aria-label="Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'requests' ? 'active' : ''}"
      onclick={() => onPanelSelect('requests')}
      title="Chat Requests"
      aria-label="Chat Requests"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
      </svg>
    </button>

    <!-- Notification bell (opens right-side drawer) -->
    <button
      class="rail-btn"
      onclick={onNotificationToggle}
      title="Notifications"
      aria-label="Notifications"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      {#if notificationCount > 0}
        <span class="rail-badge">{notificationCount > 99 ? '99+' : notificationCount}</span>
      {/if}
    </button>
  </div>

  <div class="rail-bottom">
    <button
      class="rail-btn logout"
      onclick={onLogout}
      title="Log Out"
      aria-label="Log out"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </button>

    <!-- User avatar at bottom -->
    <div class="rail-avatar" title="@{authStore.user?.username}">
      {displayName[0].toUpperCase()}
    </div>
  </div>
</nav>

<style>
  .icon-rail {
    width: var(--rail-width, 60px);
    height: 100%;
    background: var(--rail-bg);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-right: 1px solid var(--glass-border);
    flex-shrink: 0;
    z-index: 20;
  }

  .rail-top, .rail-bottom {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .rail-logo {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    margin-bottom: 0.75rem;
  }

  .rail-btn {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--rail-icon-inactive);
    cursor: pointer;
    border-radius: 12px;
    transition: all var(--transition-fast);
    position: relative;
  }

  .rail-btn:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-primary);
  }

  .rail-btn.active {
    background: var(--color-primary-light);
    color: var(--rail-icon-active);
  }

  .rail-btn.active::before {
    content: '';
    position: absolute;
    left: -6px;
    width: 3px;
    height: 20px;
    background: var(--color-primary);
    border-radius: 0 3px 3px 0;
  }

  .rail-btn.logout:hover {
    color: #f87171;
    background: rgba(248, 113, 113, 0.1);
  }

  .rail-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    background: #ef4444;
    color: white;
    font-size: 0.55rem;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    line-height: 1;
    animation: badgePop 0.3s ease-out;
  }

  .rail-avatar {
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
    margin-top: 0.5rem;
    cursor: default;
    box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  }

  @keyframes badgePop {
    0% { transform: scale(0); }
    60% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }
</style>
