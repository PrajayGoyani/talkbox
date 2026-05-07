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

  let activeIndex = $derived(
    options.findIndex((o: { value: T }) => o.value === value),
  );
</script>

<div
  class={cn(
    "relative flex p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10",
    className,
  )}
>
  <!-- Animated Background Slider -->
  <div
    class="absolute top-1 bottom-1 left-1 bg-white dark:bg-indigo-600 rounded-lg shadow-sm transition-all duration-300 ease-out z-0"
    style:width="calc((100% - 8px) / {options.length})"
    style:transform="translateX({activeIndex * 100}%)"
  ></div>

  {#each options as option (option.value)}
    <button
      class={cn(
        "relative flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold transition-colors z-10",
        {
          "text-indigo-600 dark:text-white": value === option.value,
          "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300":
            value !== option.value,
        },
      )}
      onclick={() => (value = option.value)}
    >
      {option.label}
      {#if option.badge}
        <span
          class={cn(
            "flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-black transition-colors",
            {
              "bg-indigo-600 text-white dark:bg-white dark:text-indigo-600":
                value === option.value,
              "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400":
                value !== option.value,
            },
          )}
        >
          {option.badge}
        </span>
      {/if}
    </button>
  {/each}
</div>
