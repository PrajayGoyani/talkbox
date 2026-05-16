<script lang="ts">
  import { authStore } from "$state/auth.svelte";
  import { uiStore } from "$state/ui.svelte";
  import Icon from "$components/ui/Icon.svelte";

  const user = $derived(authStore.user);
  const isPro = $derived(user?.plan === "pro");
</script>

{#if user && !authStore.isVerified}
  <div
    class={[
      "shrink-0 border-b px-4 py-2 flex items-center justify-center gap-3 text-sm transition-colors duration-500",
      isPro
        ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-400"
        : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
    ]}
  >
    <Icon name={isPro ? "verified_user" : "mail"} class="w-4 h-4 shrink-0" />
    <span class="font-medium">
      {#if isPro}
        Protect your Pro account! Verify your email for recovery.
      {:else}
        Your account is restricted. Verify your email to send messages.
      {/if}
    </span>
    <button
      class={[
        "text-xs font-bold underline hover:no-underline ml-1 px-2 py-0.5 rounded transition-colors",
        isPro ? "hover:bg-indigo-500/10" : "hover:bg-amber-500/10",
      ]}
      onclick={async () => {
        const success = await authStore.resendVerification();
        if (success) {
          uiStore.addAlert("Verification email sent!", "success");
        } else {
          uiStore.addAlert("Failed to resend. Try again later.", "danger");
        }
      }}
    >
      Resend Link
    </button>
  </div>
{/if}
