<script lang="ts">
  import { onMount } from 'svelte';

  interface Toast {
    id: number;
    senderName?: string | null;
    senderUsername: string;
    preview: string;
    chatId: string;
  }

  const { onToastClick } = $props<{
    onToastClick?: (chatId: string) => void;
  }>();

  let toasts: Toast[] = $state([]);
  let nextId = 0;

  export const addToast = (data: { senderName?: string | null; senderUsername: string; preview: string; chatId: string }) => {
    const id = nextId++;
    toasts = [...toasts, { id, ...data }];
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: number) => {
    toasts = toasts.filter(t => t.id !== id);
  };

  const handleClick = (toast: Toast) => {
    removeToast(toast.id);
    if (onToastClick) onToastClick(toast.chatId);
  };
</script>

{#if toasts.length > 0}
  <div class="toast-container">
    {#each toasts as toast (toast.id)}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="toast-card glass-panel" onclick={() => handleClick(toast)}>
        <div class="toast-avatar">
          {(toast.senderName || toast.senderUsername)[0].toUpperCase()}
        </div>
        <div class="toast-body">
          <span class="toast-sender" title="@{toast.senderUsername}">{toast.senderName || toast.senderUsername}</span>
          <span class="toast-preview">{toast.preview}</span>
        </div>
        <button class="toast-close" onclick={(e: MouseEvent) => { e.stopPropagation(); removeToast(toast.id); }} aria-label="Dismiss">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    display: flex;
    flex-direction: column-reverse;
    gap: 0.5rem;
    z-index: 1000;
    pointer-events: none;
  }

  .toast-card {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-radius: 14px;
    min-width: 300px;
    max-width: 400px;
    cursor: pointer;
    border: 1px solid var(--glass-border);
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(16px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    animation: toastSlideIn 0.3s ease-out;
    text-align: left;
    color: var(--text-primary);
    font-family: inherit;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .toast-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  }

  .toast-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .toast-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 0.1rem;
  }

  .toast-sender {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .toast-preview {
    font-size: 0.78rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    transition: color 0.15s ease;
    flex-shrink: 0;
  }

  .toast-close:hover {
    color: var(--text-primary);
  }

  @keyframes toastSlideIn {
    from {
      opacity: 0;
      transform: translateX(40px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
</style>
