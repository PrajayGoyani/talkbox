<script lang="ts" generics="T extends string">
  import { cn } from "$utils/cn";

  let {
    options,
    value = $bindable(),
    class: className = "",
  } = $props<{
    options: { label: string; value: T; badge?: number | string }[];
    value: T;
    class?: string;
  }>();
</script>

<div
  class={cn(
    "flex items-center gap-2 overflow-x-auto no-scrollbar py-1 select-none",
    className
  )}
>
  {#each options as option (option.value)}
    {@const active = value === option.value}
    <button
      type="button"
      onclick={() => (value = option.value)}
      class={cn(
        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 border",
        active
          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
          : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-700 dark:hover:text-slate-300"
      )}
    >
      {option.label}
      {#if option.badge !== undefined && option.badge !== null && option.badge !== 0}
        <span
          class={cn(
            "flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-black leading-none",
            active
              ? "bg-white text-indigo-600"
              : "bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-400"
          )}
        >
          {option.badge}
        </span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
