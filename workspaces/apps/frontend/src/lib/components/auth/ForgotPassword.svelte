<script lang="ts">
  import FloatingInput from "$components/ui/FloatingInput.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";
  import { routerStore } from "$state/router.svelte";
  import { Route } from "$utils/routes";

  let email = $state("");
  let errors: Record<string, string> = $state({});
  let emailSent = $state(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errors = {};

    if (!email.trim()) {
      errors.email = "Email is required";
      return;
    }

    const result = await authStore.forgotPassword(email);
    if (result.success) {
      emailSent = true;
    }
  };
</script>

<div class="auth-card">
  {#if emailSent}
    <!-- Success State -->
    <div class="text-center flex flex-col items-center gap-4">
      <div
        class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
      >
        <Icon name="mail" class="w-7 h-7 text-emerald-500" />
      </div>
      <h1 class="auth-title">Check your inbox</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
        If an account exists for <strong class="text-slate-700 dark:text-slate-200">{email}</strong>,
        we've sent a password reset link. Please check your spam folder too.
      </p>
    </div>

    <button
      type="button"
      class="btn-primary mt-2"
      onclick={() => routerStore.navigate(Route.LOGIN)}
    >
      Back to Sign In
    </button>
  {:else}
    <!-- Form State -->
    <div class="text-center">
      <h1 class="auth-title">Forgot password?</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px]">
        Enter your email and we'll send you a reset link
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
        id="forgot-email"
        label="Email address"
        type="email"
        bind:value={email}
        autocomplete="email"
        required
        error={errors.email}
      />

      <button type="submit" class="btn-primary mt-2" disabled={authStore.loading}>
        {#if authStore.loading}
          <span class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
          ></span>
        {:else}
          Send Reset Link
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
