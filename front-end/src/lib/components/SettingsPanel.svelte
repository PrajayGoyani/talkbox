<script lang="ts">
  import { onMount } from 'svelte';

  let currentTheme = $state<'dark' | 'light'>('dark');

  onMount(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    currentTheme = saved as 'dark' | 'light';
    applyTheme(currentTheme);
  });

  function applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(currentTheme);
  }
</script>

<div class="settings-panel">
  <div class="panel-header">
    <h2>Settings</h2>
  </div>

  <div class="settings-content">
    <!-- Theme Toggle -->
    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Theme</span>
        <span class="setting-desc">Switch between dark and light mode</span>
      </div>
      <button class="theme-toggle" onclick={toggleTheme} aria-label="Toggle theme">
        <div class="toggle-track {currentTheme}">
          <div class="toggle-thumb">
            {#if currentTheme === 'dark'}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            {/if}
          </div>
        </div>
      </button>
    </div>

    <hr class="divider" />

    <!-- Placeholder sections -->
    <div class="setting-item disabled">
      <div class="setting-info">
        <span class="setting-label">Notification Sound</span>
        <span class="setting-desc">Play a sound for incoming messages</span>
      </div>
      <span class="coming-soon">Coming Soon</span>
    </div>

    <div class="setting-item disabled">
      <div class="setting-info">
        <span class="setting-label">Privacy</span>
        <span class="setting-desc">Manage who can send you chat requests</span>
      </div>
      <span class="coming-soon">Coming Soon</span>
    </div>
  </div>
</div>

<style>
  .settings-panel {
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

  .settings-content {
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-radius: 12px;
    transition: background var(--transition-fast);
  }

  .setting-item:not(.disabled):hover {
    background: rgba(255, 255, 255, 0.03);
  }

  .setting-item.disabled {
    opacity: 0.5;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .setting-label {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
  }

  .setting-desc {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .theme-toggle {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
  }

  .toggle-track {
    width: 48px;
    height: 26px;
    border-radius: 13px;
    position: relative;
    transition: background var(--transition-smooth);
  }

  .toggle-track.dark {
    background: var(--color-primary);
  }

  .toggle-track.light {
    background: #94a3b8;
  }

  .toggle-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: left var(--transition-smooth);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .toggle-track.dark .toggle-thumb {
    left: 2px;
    color: var(--color-primary);
  }

  .toggle-track.light .toggle-thumb {
    left: 24px;
    color: #f59e0b;
  }

  .coming-soon {
    font-size: 0.7rem;
    color: var(--text-muted);
    background: rgba(255, 255, 255, 0.05);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    white-space: nowrap;
  }

  .divider {
    border: none;
    border-top: 1px solid var(--glass-border);
    margin: 0.25rem 0;
  }
</style>
