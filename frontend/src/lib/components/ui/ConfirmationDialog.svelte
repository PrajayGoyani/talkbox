<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { confirmStore } from "../../state/confirm.svelte";
  import Icon from "./Icon.svelte";
  import { cn } from "../../utils/cn";

  const isDanger = $derived(confirmStore.variant === "danger");
  const isWarning = $derived(confirmStore.variant === "warning");

  const handleKeydown = (e: KeyboardEvent) => {
    if (!confirmStore.isOpen) return;
    if (e.key === "Escape") {
      confirmStore.cancel();
    }
    if (e.key === "Enter") {
      confirmStore.confirm();
    }
  };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if confirmStore.isOpen}
  <div
    class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
    in:fade={{ duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70"
      onclick={() => confirmStore.cancel()}
    ></div>

    <!-- Dialog -->
    <div
      class="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-white/10"
      in:fly={{ y: 20, duration: 400, opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div class="flex flex-col items-center text-center">
        <!-- Icon Header -->
        <div
          class={cn(
            "mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-xl",
            isDanger && "bg-rose-500 text-white shadow-rose-500/20",
            isWarning && "bg-amber-500 text-white shadow-amber-500/20",
            !isDanger && !isWarning && "bg-indigo-600 text-white shadow-indigo-600/20"
          )}
        >
          <Icon 
            name={isDanger ? "trash" : (isWarning ? "clock" : "check")} 
            class="h-8 w-8" 
            stroke-width="2.5" 
          />
        </div>

        <h2
          id="confirm-title"
          class="mb-3 text-2xl font-bold text-slate-900 dark:text-white"
        >
          {confirmStore.title}
        </h2>
        
        <p class="mb-8 text-[15px] leading-relaxed text-slate-500 dark:text-slate-400">
          {confirmStore.message}
        </p>

        <div class="flex w-full flex-col gap-3 sm:flex-row">
          <button
            class="flex-1 rounded-2xl bg-slate-100 px-6 py-3.5 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
            onclick={() => confirmStore.cancel()}
          >
            {confirmStore.cancelText}
          </button>
          <button
            class={cn(
              "flex-1 rounded-2xl px-6 py-3.5 text-sm font-bold text-white transition-all active:scale-95 shadow-lg",
              isDanger && "bg-rose-500 hover:bg-rose-600 shadow-rose-500/25",
              isWarning && "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25",
              !isDanger && !isWarning && "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
            )}
            onclick={() => confirmStore.confirm()}
          >
            {confirmStore.confirmText}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
