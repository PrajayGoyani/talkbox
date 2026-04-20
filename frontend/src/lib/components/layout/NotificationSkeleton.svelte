<script lang="ts">
  import Skeleton from "$components/ui/Skeleton.svelte";

  let { count = 1 } = $props<{ count?: number }>();
</script>

{#each Array(count) as _}
  <div class="flex gap-4 p-4 w-full border-b border-slate-200 dark:border-white/5 opacity-60">
    <div class="shrink-0">
      <Skeleton width="2.5rem" height="2.5rem" rounded="0.75rem" />
    </div>
    <div class="flex flex-col flex-1 gap-2 py-0.5">
      <Skeleton width="30%" height="0.625rem" />
      <Skeleton width="85%" height="0.875rem" />
      <Skeleton width="20%" height="0.625rem" />
    </div>
  </div>
{/each}
