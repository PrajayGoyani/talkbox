<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { API_ROOT } from "$lib/config";
  import { cn } from "$utils/cn";

  let {
    user,
    class: className = "",
    showBadge = false,
  } = $props<{
    user: {
      name?: string | null;
      username?: string | null;
      avatarUrl?: string | null;
      plan?: string;
    } | null;
    class?: string;
    showBadge?: boolean;
  }>();

  const resolvedAvatarUrl = $derived.by(() => {
    const url = user?.avatarUrl;
    if (!url) return null;

    if (url.startsWith("/uploads/")) {
      return `${API_ROOT}${url}`;
    }

    if (url.startsWith("http://localhost:3000/uploads/")) {
      return url.replace("http://localhost:3000", API_ROOT);
    }

    return url;
  });

  const isPro = $derived(user?.plan === "pro");
</script>

<div class="relative inline-flex shrink-0">
  {#if resolvedAvatarUrl}
    <img
      src={resolvedAvatarUrl}
      class={cn("rounded-full object-cover shrink-0", className)}
      alt={user?.name || user?.username}
    />
  {:else}
    <div
      class={cn(
        "rounded-full flex items-center justify-center font-bold shrink-0",
        className,
      )}
    >
      {((user?.name || user?.username)?.[0] || "?").toUpperCase()}
    </div>
  {/if}

  {#if showBadge && isPro}
    <div
      class="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-linear-to-tr from-indigo-600 to-purple-500 border border-white dark:border-zinc-900 flex items-center justify-center shadow-lg"
      title="Pro Member"
    >
      <Icon name="bolt" class="w-2.5 h-2.5 text-white" />
    </div>
  {/if}
</div>
