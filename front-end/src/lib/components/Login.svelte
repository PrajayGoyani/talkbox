<script lang="ts">
  import { authStore } from '../state/auth.svelte';

  const { toggleSignup } = $props<{ toggleSignup: any }>();

  let username = $state('');
  let password = $state('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!username || !password) return;
    await authStore.login({ username, password });
  };
</script>

<div class="auth-card glass-panel">
  <div class="auth-header">
    <h1>Welcome back</h1>
    <p>Sign in to continue your conversations</p>
  </div>

  {#if authStore.error}
    <div class="error-banner">
      {authStore.error}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="auth-form">
    <div class="form-group">
      <label for="username">Username or Email</label>
      <input
        type="text"
        id="username"
        bind:value={username}
        placeholder="Enter your username"
        required
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        placeholder="••••••••"
        required
      />
    </div>

    <button type="submit" class="auth-btn" disabled={authStore.loading}>
      {#if authStore.loading}
        <span class="loader"></span>
      {:else}
        Sign In
      {/if}
    </button>
  </form>

  <div class="auth-footer">
    <p>Don't have an account? {#if toggleSignup}{@render toggleSignup()}{/if}</p>
  </div>
</div>

<style>
  .auth-card {
    width: 100%;
    max-width: 420px;
    padding: 2.5rem;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    animation: fadeIn 0.5s ease-out;
  }

  .auth-header {
    text-align: center;
  }

  .auth-header h1 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #fff 0%, #94a3b8 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .auth-header p {
    color: var(--text-secondary);
    font-size: 0.95rem;
  }

  .error-banner {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    font-size: 0.85rem;
    text-align: center;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-left: 0.25rem;
  }

  .form-group input {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: var(--transition-smooth);
  }

  .form-group input:focus {
    border-color: var(--color-primary);
    background: rgba(0, 0, 0, 0.3);
    box-shadow: 0 0 0 4px var(--color-primary-light);
  }

  .auth-btn {
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 12px;
    padding: 0.85rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: var(--transition-fast);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.5rem;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  .auth-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.4);
  }

  .auth-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loader {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: #fff;
    animation: spin 0.8s linear infinite;
  }

  .auth-footer {
    text-align: center;
    font-size: 0.9rem;
    color: var(--text-secondary);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
