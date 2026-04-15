<script lang="ts">
  import { authStore } from "../../state/auth.svelte";
  import { routerStore } from "../../state/router.svelte";
  import FloatingInput from "../ui/FloatingInput.svelte";
  import Icon from "../ui/Icon.svelte";

  const { toggleSignup } = $props<{ toggleSignup: any }>();

  let username = $state("");
  let password = $state("");
  let showPassword = $state(false);
  let errors: Record<string, string> = $state({});

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    errors = {};

    if (!username.trim()) errors.username = "Username or email is required";
    if (!password) errors.password = "Password is required";

    if (Object.keys(errors).length > 0) return;

    const success = await authStore.login({ username, password });
    if (success) {
      routerStore.navigate("/chat/conversations");
    }
  };
</script>

<div class="auth-card">
  <div class="text-center">
    <h1 class="auth-title">Welcome back</h1>
    <!-- <div class="flex flex-col items-center gap-3 mb-2">
      <img src="/favicon.png" alt="Talkbox Logo" class="w-16 h-16 rounded-2xl shadow-lg ring-4 ring-indigo-600/10" />
      <h1 class="auth-title mt-2">Welcome to Talkbox</h1>
    </div> -->
    <p class="text-slate-500 dark:text-slate-400 text-[15px]">
      Sign in to continue your conversations
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
      label="Username or Email"
      bind:value={username}
      autocomplete="username"
      required
      error={errors.username}
    />

    <FloatingInput
      id="password"
      label="Password"
      type={showPassword ? "text" : "password"}
      bind:value={password}
      autocomplete="current-password"
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



    <button type="submit" class="btn-primary mt-2" disabled={authStore.loading}>
      {#if authStore.loading}
        <span
          class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"
        ></span>
      {:else}
        Sign In
      {/if}
    </button>
  </form>

  <div class="text-center text-[14px] text-slate-500 dark:text-slate-400 mt-2">
    <p>
      Don't have an account? {#if toggleSignup}{@render toggleSignup()}{/if}
    </p>
  </div>
</div>
