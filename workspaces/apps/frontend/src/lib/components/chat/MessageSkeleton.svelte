<script lang="ts">
  import Skeleton from "$components/ui/Skeleton.svelte";

  let { sent = false } = $props();
</script>

<div class={["flex flex-col gap-1 mb-4 opacity-60", sent ? "items-end" : "items-start"]}>
  <Skeleton
    width={sent ? "60%" : "65%"}
    height="3rem"
    rounded={sent ? "1.25rem 1.25rem 0.25rem 1.25rem" : "1.25rem 1.25rem 1.25rem 0.25rem"}
  />
  <Skeleton width="15%" height="0.625rem" rounded="4px" />
</div>
