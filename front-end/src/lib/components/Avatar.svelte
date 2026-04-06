<script lang="ts">
  let { user, class: className = "" } = $props<{
    user: { name?: string | null; username?: string | null; avatarUrl?: string | null } | null;
    class?: string;
  }>();
</script>

{#if user?.avatarUrl}
  <img 
    src={user.avatarUrl} 
    alt={user?.name || user?.username || "User avatar"} 
    class="rounded-full object-cover shrink-0 {className}" 
    title="@{user?.username}"
  />
{:else}
  <div
    class="rounded-full flex items-center justify-center font-bold shrink-0 {" " + className}"
    title="@{user?.username}"
  >
    {((user?.name || user?.username)?.[0] || "?").toUpperCase()}
  </div>
{/if}
