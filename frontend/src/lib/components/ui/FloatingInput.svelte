<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    id,
    label,
    value = $bindable(),
    type = "text",
    required = false,
    error = "",
    autocomplete = "",
    renderRight,
    ...rest
  } = $props<{
    id: string;
    label: string;
    value: string;
    type?: string;
    required?: boolean;
    error?: string;
    autocomplete?: string;
    renderRight?: Snippet;
    [key: string]: any;
  }>();
</script>

<div class="floating-label-group flex flex-col">
  <div class="relative flex items-center">
    <input
      {id}
      {type}
      {required}
      {autocomplete}
      bind:value
      placeholder=" "
      class={[
        "input-field peer",
        { "border-rose-500! ring-rose-500/10!": error },
        { "pr-12": renderRight },
      ]}
      {...rest}
    />
    <label
      for={id}
      class="floating-label peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
    >
      {label}
    </label>

    {#if renderRight}
      <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {@render renderRight()}
      </div>
    {/if}
  </div>

  {#if error}
    <span class="text-rose-500 text-xs mt-1 ml-1 animate-in fade-in duration-300"
      >{error}</span
    >
  {/if}
</div>
