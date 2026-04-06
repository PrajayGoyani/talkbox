<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { routerStore } from "../state/router.svelte";

  const { toggleLogin } = $props<{ toggleLogin: any }>();

  let username = $state("");
  let displayName = $state("");
  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let showConfirmPassword = $state(false);
  let errors: Record<string, string> = $state({});

  /**
   * Frontend name sanitizer: strip special chars, capitalize words.
   * Mirrors the backend sanitizeName transform.
   */
  function sanitizeName(val: string): string {
    return val
      .trim()
      .replace(/[^a-zA-Z\s\-']/g, "")
      .replace(/\s+/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errors = {};

    if (!username.trim()) errors.username = "Username is required";
    else if (!/^[a-zA-Z0-9]{3,30}$/.test(username)) {
      errors.username = "Username must be 3-30 alphanumeric characters";
    }

    if (!email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    if (!password) errors.password = "Password is required";
    else if (password.length < 8)
      errors.password = "Password must be at least 8 characters";

    if (!confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword)
      errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) return;

    // Sanitize name before sending
    const sanitizedName = displayName.trim()
      ? sanitizeName(displayName)
      : undefined;

    const success = await authStore.signup({
      username: username.toLowerCase(),
      email,
      password,
      ...(sanitizedName ? { name: sanitizedName } : {}),
    });
    
    if (success) {
      routerStore.navigate('/chat/conversations');
    }
  };
</script>

<div class="auth-card">
  <div class="text-center">
    <h1 class="auth-title">Create Account</h1>
    <p class="text-slate-500 dark:text-slate-400 text-[15px]">
      Join the conversation with premium security
    </p>
  </div>

  {#if authStore.error}
    <div
      class="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-sm text-center"
    >
      {authStore.error}
    </div>
  {/if}

  <form onsubmit={handleSubmit} class="flex flex-col gap-5" novalidate>
    <div class="flex flex-col gap-2">
      <input
        type="text"
        id="username"
        bind:value={username}
        placeholder="Choose a username"
        required
        class="input-field"
      />
      {#if errors.username}
        <span
          class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
          >{errors.username}</span
        >
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="display-name"
        class="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-1"
        >Display Name <span class="text-[10px] text-slate-500 font-normal ml-1"
          >(optional)</span
        ></label
      >
      <input
        type="text"
        id="display-name"
        bind:value={displayName}
        placeholder="How you'd like to be called"
        maxlength="50"
        class="input-field"
      />
      {#if errors.displayName}
        <span
          class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
          >{errors.displayName}</span
        >
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="email"
        class="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-1"
        >Email Address</label
      >
      <input
        type="email"
        id="email"
        bind:value={email}
        placeholder="you@example.com"
        required
        class="input-field"
      />
      {#if errors.email}
        <span
          class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
          >{errors.email}</span
        >
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="password"
        class="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-1"
        >Password</label
      >
      <div class="relative flex items-center">
        <input
          type={showPassword ? "text" : "password"}
          id="password"
          bind:value={password}
          placeholder="At least 8 characters"
          required
          class="input-field pr-12"
        />
        <button
          type="button"
          class="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {#if showPassword}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              ></path><line x1="1" y1="1" x2="23" y2="23"></line></svg
            >
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              ></path><circle cx="12" cy="12" r="3"></circle></svg
            >
          {/if}
        </button>
      </div>
      {#if errors.password}
        <span
          class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
          >{errors.password}</span
        >
      {/if}
    </div>

    <div class="flex flex-col gap-2">
      <label
        for="confirm-password"
        class="text-sm font-semibold text-slate-600 dark:text-slate-400 ml-1"
        >Confirm Password</label
      >
      <div class="relative flex items-center">
        <input
          type={showConfirmPassword ? "text" : "password"}
          id="confirm-password"
          bind:value={confirmPassword}
          placeholder="Re-enter your password"
          required
          class="input-field pr-12"
        />
        <button
          type="button"
          class="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onclick={() => (showConfirmPassword = !showConfirmPassword)}
          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
        >
          {#if showConfirmPassword}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path
                d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
              ></path><line x1="1" y1="1" x2="23" y2="23"></line></svg
            >
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
              ></path><circle cx="12" cy="12" r="3"></circle></svg
            >
          {/if}
        </button>
      </div>
      {#if errors.confirmPassword}
        <span
          class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
          >{errors.confirmPassword}</span
        >
      {/if}
    </div>

    <button type="submit" class="btn-primary" disabled={authStore.loading}>
      {#if authStore.loading}
        <span
          class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
        ></span>
      {:else}
        Create Account
      {/if}
    </button>
  </form>

  <div class="text-center text-[14px] text-slate-500 dark:text-slate-400 mt-2">
    <p>
      Already have an account? {#if toggleLogin}{@render toggleLogin()}{/if}
    </p>
  </div>
</div>
