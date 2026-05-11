<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";
  import { routerStore } from "$state/router.svelte";
  import { Route } from "$utils/routes";

  let status: "loading" | "success" | "error" = $state("loading");

  const token = $derived(routerStore.params.token || "");

  $effect(() => {
    if (!token) {
      authStore.error = "Missing verification token.";
      status = "error";
      return;
    }

    authStore.verifyEmail(token).then((result) => {
      status = result.success ? "success" : "error";
    });
  });
</script>

<div class="auth-card">
  {#if status === "loading"}
    <!-- Loading State -->
    <div class="text-center flex flex-col items-center gap-4 py-4">
      <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
        <span class="w-7 h-7 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></span>
      </div>
      <h1 class="auth-title">Verifying email...</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px]">Please wait a moment</p>
    </div>
  {:else if status === "success"}
    <!-- Success State -->
    <div class="text-center flex flex-col items-center gap-4">
      <div
        class="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
      >
        <Icon name="check" class="w-7 h-7 text-emerald-500" />
      </div>
      <h1 class="auth-title">Email verified!</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
        Your email has been verified successfully. You're all set!
      </p>
    </div>

    <button
      type="button"
      class="btn-primary mt-2"
      onclick={() => routerStore.navigate(authStore.user ? Route.CONVERSATIONS : Route.LOGIN)}
    >
      {authStore.user ? "Go to Conversations" : "Sign In"}
    </button>
  {:else}
    <!-- Error State -->
    <div class="text-center flex flex-col items-center gap-4">
      <div class="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <Icon name="alert-circle" class="w-7 h-7 text-rose-500" />
      </div>
      <h1 class="auth-title">Verification failed</h1>
      <p class="text-slate-500 dark:text-slate-400 text-[15px] leading-relaxed">
        {authStore.error || "The verification link is invalid or has expired."}
      </p>
    </div>

    <button
      type="button"
      class="btn-primary mt-2"
      onclick={() => routerStore.navigate(authStore.user ? Route.CONVERSATIONS : Route.LOGIN)}
    >
      {authStore.user ? "Go to Conversations" : "Sign In"}
    </button>
  {/if}
</div>
