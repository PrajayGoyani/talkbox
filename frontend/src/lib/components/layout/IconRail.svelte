<script lang="ts">
  import { authStore } from "$state/auth.svelte";

  import Avatar from "$components/ui/Avatar.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import { routerStore } from "$state/router.svelte";
  import { tooltip } from "$state/tooltip.svelte";
  import { uiStore } from "$state/ui.svelte";

  type PanelId = "conversations" | "profile" | "settings" | "requests" | "pricing";

  const {
    activePanel,
    onPanelSelect,
    onNotificationToggle,
    notificationCount = 0,
    requestsCount = 0,
    onLogout,
    hideOnMobile = false,
  } = $props<{
    activePanel: PanelId;
    onPanelSelect: (panel: PanelId) => void;
    onNotificationToggle: () => void;
    notificationCount?: number;
    requestsCount?: number;
    onLogout: () => void;
    hideOnMobile?: boolean;
  }>();

  const displayName = $derived(
    authStore.user?.name || authStore.user?.username || "?",
  );

  const tooltipPos = $derived(uiStore.windowWidth < 768 ? "top" : "right");
</script>

<nav
  class="w-full md:w-[60px] h-[60px] md:h-full bg-slate-900 flex-row md:flex-col justify-between items-center px-4 py-0 md:px-0 md:py-4 border-t md:border-t-0 md:border-r border-white/5 shrink-0 z-20 order-last md:order-first {hideOnMobile
    ? 'hidden md:flex'
    : 'flex'}"
>
  <div
    class="flex flex-row md:flex-col items-center gap-2 md:gap-1 w-full md:w-auto justify-between md:justify-start"
  >
    <!-- App Logo / Home Button -->
    <button
      class="w-10 h-10 flex items-center justify-center text-indigo-500 md:mb-3 hover:bg-white/10 rounded-xl transition-all active:scale-90"
      onclick={() => routerStore.navigate("/")}
      use:tooltip={{ text: "Talkbox Home", position: tooltipPos }}
      aria-label="Back to Home"
    >
      <Icon name="home" class="w-6 h-6" />
    </button>

    <!-- Navigation Icons -->
    {#each [
      { id: "conversations", title: "Conversations", icon: "nav-chat" },
      { id: "profile", title: "Profile", icon: "profile" },
      { id: "settings", title: "Settings", icon: "settings" },
      { id: "requests", title: "Chat Requests", icon: "add" },
      ...(authStore.user?.plan === "free" ? [{ id: "pricing", title: "Upgrade to Pro", icon: "bolt" }] : [])
    ] as item}
      <button
        class="rail-btn {activePanel === item.id
          ? 'rail-btn-active'
          : ''} relative"
        onclick={() => onPanelSelect(item.id as PanelId)}
        use:tooltip={{ text: item.title, position: tooltipPos }}
        aria-label={item.title}
      >
        <Icon name={item.icon} class="w-5.5 h-5.5" />
        {#if item.id === "requests" && requestsCount > 0}
          <span
            class="absolute top-1 right-1 bg-indigo-600 text-white text-[9px] font-bold min-w-[15px] h-3.5 rounded-full flex items-center justify-center px-1 shadow-sm animate-in scale-in-60"
          >
            {requestsCount > 9 ? "9+" : requestsCount}
          </span>
        {/if}
      </button>
    {/each}

    <!-- Notification bell (opens right-side drawer) -->
    <button
      class="w-11 h-11 hidden md:flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all relative active:scale-90"
      onclick={onNotificationToggle}
      use:tooltip={{ text: "Notifications", position: tooltipPos }}
      aria-label="Notifications"
    >
      <Icon name="notifications" class="w-5.5 h-5.5" />
      {#if notificationCount > 0}
        <span
          class="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 shadow-sm animate-in scale-in-0 duration-300"
        >
          {notificationCount > 99 ? "99+" : notificationCount}
        </span>
      {/if}
    </button>
  </div>

  <div class="hidden md:flex flex-col items-center gap-1">
    <button
      class="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all active:scale-90"
      onclick={onLogout}
      use:tooltip={{ text: "Log Out", position: tooltipPos }}
      aria-label="Log out"
    >
      <Icon name="logout" class="w-5 h-5" />
    </button>

    <!-- User avatar at bottom -->
    <div class="md:mt-2">
      <Avatar
        user={authStore.user}
        class="w-9 h-9 bg-indigo-600 text-white text-sm shadow-lg shadow-indigo-500/20 border-2 border-slate-900"
      />
    </div>
  </div>
</nav>
