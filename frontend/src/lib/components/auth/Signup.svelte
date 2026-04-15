<script lang="ts">
  import { authStore } from "../../state/auth.svelte";
  import { routerStore } from "../../state/router.svelte";
  import FloatingInput from "../ui/FloatingInput.svelte";
  import Icon from "../ui/Icon.svelte";

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
      routerStore.navigate("/chat/conversations");
    }
  };
</script>

<div class="auth-card">
  <div class="text-center">
    <h1 class="auth-title">Create Account</h1>
    <!-- <div class="flex flex-col items-center gap-3 mb-2">
      <img src="/favicon.png" alt="Talkbox Logo" class="w-16 h-16 rounded-2xl shadow-lg ring-4 ring-indigo-600/10" />
      <h1 class="auth-title mt-2">Join Talkbox</h1>
    </div> -->
    <p class="text-slate-500 dark:text-slate-400 text-[15px]">
      Join the conversation with premium security
      <!-- Start your journey with premium security -->
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
    <FloatingInput
      id="username"
      label="Username"
      bind:value={username}
      autocomplete="username"
      required
      error={errors.username}
    />

    <FloatingInput
      id="display-name"
      label="Display Name (optional)"
      bind:value={displayName}
      autocomplete="name"
      maxlength="50"
      error={errors.displayName}
    />

    <FloatingInput
      id="email"
      label="Email Address"
      type="email"
      bind:value={email}
      autocomplete="email"
      required
      error={errors.email}
    />

    <FloatingInput
      id="password"
      label="Password"
      type={showPassword ? "text" : "password"}
      bind:value={password}
      autocomplete="new-password"
      required
      error={errors.password}
    >
      {#snippet renderRight()}
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >

          {#if showPassword}
            <Icon name="eye-off" class="w-[18px] h-[18px]" />
          {:else}
            <Icon name="eye" class="w-[18px] h-[18px]" />
          {/if}
        </button>
      {/snippet}
    </FloatingInput>


    <FloatingInput
      id="confirm-password"
      label="Confirm Password"
      type={showConfirmPassword ? "text" : "password"}
      bind:value={confirmPassword}
      autocomplete="new-password"
      required
      error={errors.confirmPassword}
    >
      {#snippet renderRight()}
        <button
          type="button"
          class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          onclick={() => (showConfirmPassword = !showConfirmPassword)}
          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
        >

          {#if showConfirmPassword}
            <Icon name="eye-off" class="w-[18px] h-[18px]" />
          {:else}
            <Icon name="eye" class="w-[18px] h-[18px]" />
          {/if}
        </button>
      {/snippet}
    </FloatingInput>



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
