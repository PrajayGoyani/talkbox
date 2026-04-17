<script lang="ts">
  import { API_ROOT } from "../../config";
  import { cn } from "../../utils/cn";

  let { user, class: className = "" } = $props<{
    user: {
      name?: string | null;
      username?: string | null;
      avatarUrl?: string | null;
    } | null;
    class?: string;
  }>();

  const resolvedAvatarUrl = $derived.by(() => {
    const url = user?.avatarUrl;
    if (!url) return null;

    // 1. Handle relative paths from current/future uploads
    if (url.startsWith("/uploads/")) {
      return `${API_ROOT}${url}`;
    }

    // 2. Handle legacy absolute URLs that were hardcoded to localhost during dev
    if (url.startsWith("http://localhost:3000/uploads/")) {
      return url.replace("http://localhost:3000", API_ROOT);
    }

    return url;
  });
</script>

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
      className
    )}
  >
    {((user?.name || user?.username)?.[0] || "?").toUpperCase()}
  </div>
{/if}
