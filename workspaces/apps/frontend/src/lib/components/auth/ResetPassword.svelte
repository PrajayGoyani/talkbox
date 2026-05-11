<script lang="ts">
  import FloatingInput from "$components/ui/FloatingInput.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";
  import { routerStore } from "$state/router.svelte";
  import { Route } from "$utils/routes";

  let password = $state("");
  let confirmPassword = $state("");
  let showPassword = $state(false);
  let errors: Record<string, string> = $state({});
  let resetSuccess = $state(false);

  const token = $derived(routerStore.params.token || "");

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errors = {};

    if (!password) errors.password = "Password is required";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) return;

    if (!token) {
      authStore.error = "Invalid reset link. Please request a new one.";
      return;
    }

    const result = await authStore.resetPassword(token, password);
    if (result.success) {
      resetSuccess = true;
      // Auto-redirect to login after 3 seconds
      setTimeout(() => routerStore.navigate(Route.LOGIN), 3000);
    }
  };
</script>

<div class="auth-card">
  {#if resetSuccess}
    <!-- Success State -->
    <div class="text-center flex flex-col items-center gap-4">
      <div
        class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
      >
        <Icon name="check" class="w-7 h-7 text-emerald-500" />
      </div>
      <h1 class="auth-title">Password updated!</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
        Your password has been reset successfully. Redirecting to sign in...
      </p>
    </div>

    <button type="button" class="btn-primary mt-2" onclick={() => routerStore.navigate(Route.LOGIN)}>
      Sign In Now
    </button>
  {:else}
    <!-- Form State -->
    <div class="text-center">
      <h1 class="auth-title">Reset password</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px]">Choose a new password for your account</p>
    </div>

    {#if !token}
      <div
        class="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-3 rounded-xl text-sm text-center"
      >
        Invalid or missing reset token. Please request a new reset link.
      </div>
    {/if}

    {#if authStore.error}
      <div class="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-3 rounded-xl text-sm text-center">
        {authStore.error}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="flex flex-col gap-5" novalidate>
      <FloatingInput
        id="new-password"
        label="New Password"
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
        type={showPassword ? "text" : "password"}
        bind:value={confirmPassword}
        autocomplete="new-password"
        required
        error={errors.confirmPassword}
      />

      <button type="submit" class="btn-primary mt-2" disabled={authStore.loading || !token}>
        {#if authStore.loading}
          <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {:else}
          Reset Password
        {/if}
      </button>
    </form>

    <div class="text-center text-[14px] text-slate-500 dark:text-slate-400 mt-2">
      <p>
        Remember your password?
        <button
          type="button"
          class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          onclick={() => routerStore.navigate(Route.LOGIN)}
        >
          Sign In
        </button>
      </p>
    </div>
  {/if}
</div>
