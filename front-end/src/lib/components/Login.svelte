<script lang="ts">
  import { authStore } from '../state/auth.svelte';

  const { toggleSignup } = $props<{ toggleSignup: any }>();

  let username = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let errors: Record<string, string> = $state({});

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errors = {};
    
    if (!username.trim()) errors.username = 'Username or email is required';
    if (!password) errors.password = 'Password is required';
    
    if (Object.keys(errors).length > 0) return;
    
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

  <form onsubmit={handleSubmit} class="auth-form" novalidate>
    <div class="form-group">
      <label for="username">Username or Email</label>
      <input
        type="text"
        id="username"
        bind:value={username}
        placeholder="Enter your username or email"
        required
      />
      {#if errors.username}
        <span class="inline-error">{errors.username}</span>
      {/if}
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <div class="password-wrapper">
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          bind:value={password}
          placeholder="••••••••"
          required
        />
        <button 
          type="button" 
          class="toggle-password" 
          onclick={() => showPassword = !showPassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {#if showPassword}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          {/if}
        </button>
      </div>
      {#if errors.password}
        <span class="inline-error">{errors.password}</span>
      {/if}
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

  .inline-error {
    color: #f87171;
    font-size: 0.8rem;
    margin-top: 0.2rem;
    margin-left: 0.25rem;
    animation: fadeIn 0.3s ease-out;
  }

  .form-group label {
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-left: 0.25rem;
  }

  .form-group input {
    width: 100%;
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid var(--glass-border);
    border-radius: 12px;
    padding: 0.85rem 1rem;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: var(--transition-smooth);
    box-sizing: border-box;
  }

  .password-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .password-wrapper input {
    padding-right: 2.5rem;
  }

  .toggle-password {
    position: absolute;
    right: 0.75rem;
    background: none;
    border: none;
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: color 0.2s;
  }

  .toggle-password:hover {
    color: var(--text-primary);
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
