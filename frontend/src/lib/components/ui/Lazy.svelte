<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import Spinner from "$components/ui/Spinner.svelte";
  import { onMount, type Component } from "svelte";

  /**
   * Reusable Lazy loader for Svelte 5 components.
   * Usage: <Lazy component={() => import('./MyComponent.svelte')} prop1={value} />
   */
  let {
    component,
    delay = 300,
    ...props
  } = $props<{
    /** A function that returns a dynamic import promise */
    component: () => Promise<{ default: Component<any> }>;
    /** How long to wait before showing the loading spinner (ms) */
    delay?: number;
    /** Any other props to pass to the component once loaded */
    [key: string]: any;
  }>();

  let LoadedComponent = $state<Component<any>>();
  let isLoading = $state(true);
  let showLoading = $state(false);
  let error = $state<any>(null);

  async function loadComponent() {
    isLoading = true;
    error = null;

    // Start delay timer for spinner visibility
    const timer = setTimeout(() => {
      if (isLoading) showLoading = true;
    }, delay);

    try {
      const module = await component();
      LoadedComponent = module.default;
    } catch (err) {
      console.error("Lazy component load failed:", err);
      error = err;
    } finally {
      clearTimeout(timer);
      isLoading = false;
      showLoading = false;
    }
  }

  onMount(() => {
    loadComponent();
  });
</script>

{#if isLoading && showLoading}
  <div
    class="flex items-center justify-center p-12 w-full h-full min-h-[100px]"
  >
    <div class="flex flex-col items-center gap-3">
      <Spinner class="w-8 h-8 text-indigo-500 animate-spin" />
      <span class="text-xs font-medium text-slate-400 animate-pulse"
        >Loading...</span
      >
    </div>
  </div>
{:else if isLoading}
  <!-- Content is loading but we are within the delay grace period - render nothing -->
  <div class="w-full h-full min-h-[100px]"></div>
{:else if error}
  <div
    class="p-8 flex flex-col items-center justify-center text-center gap-4 h-full"
  >
    <div class="text-rose-500 opacity-50">
      <Icon name="alert-circle" class="w-12 h-12" />
    </div>
    <div class="max-w-xs">
      <h3 class="text-slate-900 dark:text-white font-semibold">
        Failed to load content
      </h3>
      <p class="text-sm text-slate-500 mt-1">
        There was an error loading this part of the application.
      </p>
      <button
        onclick={loadComponent}
        class="mt-4 px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
      >
        Retry Loading
      </button>
    </div>
  </div>
{:else if LoadedComponent}
  <LoadedComponent {...props} />
{/if}
