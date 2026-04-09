<script lang="ts">
  import Skeleton from "./Skeleton.svelte";
</script>

<div class="flex items-center gap-3 p-3 opacity-60">
  <Skeleton width="2.75rem" height="2.75rem" rounded="9999px" />
  <div class="flex-1 flex flex-col gap-2">
    <div class="flex justify-between items-center">
      <Skeleton width="40%" height="0.875rem" />
      <Skeleton width="20%" height="0.625rem" />
    </div>
    <Skeleton width="70%" height="0.75rem" />
  </div>
</div>
