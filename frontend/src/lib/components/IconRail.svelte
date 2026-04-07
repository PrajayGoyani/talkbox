<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import Avatar from "./Avatar.svelte";
  import Icon from "./Icon.svelte";

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  const {
    activePanel,
    onPanelSelect,
    onNotificationToggle,
    notificationCount = 0,
    onLogout,
    hideOnMobile = false,
  } = $props<{
    activePanel: PanelId;
    onPanelSelect: (panel: PanelId) => void;
    onNotificationToggle: () => void;
    notificationCount?: number;
    onLogout: () => void;
    hideOnMobile?: boolean;
  }>();

  const displayName = $derived(
    authStore.user?.name || authStore.user?.username || "?",
  );
</script>

<nav
  class="w-full md:w-[60px] h-[60px] md:h-full bg-slate-900 flex-row md:flex-col justify-between items-center px-4 py-0 md:px-0 md:py-4 border-t md:border-t-0 md:border-r border-white/5 shrink-0 z-20 order-last md:order-first {hideOnMobile ? 'hidden md:flex' : 'flex'}"
>
  <div class="flex flex-row md:flex-col items-center gap-2 md:gap-1 w-full md:w-auto justify-between md:justify-start">
    <!-- App Logo (hidden on mobile) -->
    <div
      class="w-10 h-10 hidden md:flex items-center justify-center text-indigo-500 mb-3"
    >
      <Icon name="nav-chat" class="w-6 h-6" />
    </div>

    <!-- Navigation Icons -->
    <button
      class="rail-btn {activePanel === 'conversations'
        ? 'rail-btn-active'
        : ''}"
      onclick={() => onPanelSelect("conversations")}
      title="Conversations"
      aria-label="Conversations"
    >
      <Icon name="nav-chat" class="w-5.5 h-5.5" />
    </button>

    <button
      class="rail-btn {activePanel === 'profile' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("profile")}
      title="Profile"
      aria-label="Profile"
    >
      <Icon name="profile" class="w-5.5 h-5.5" />
    </button>

    <button
      class="rail-btn {activePanel === 'settings' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("settings")}
      title="Settings"
      aria-label="Settings"
    >
      <Icon name="settings" class="w-5.5 h-5.5" />
    </button>

    <button
      class="rail-btn {activePanel === 'requests' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("requests")}
      title="Chat Requests"
      aria-label="Chat Requests"
    >
      <Icon name="add" class="w-5.5 h-5.5" />
    </button>

    <!-- Notification bell (opens right-side drawer) -->
    <button
      class="w-11 h-11 hidden md:flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all relative"
      onclick={onNotificationToggle}
      title="Notifications"
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
      class="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
      onclick={onLogout}
      title="Log Out"
      aria-label="Log out"
    >
      <Icon name="logout" class="w-5 h-5" />
    </button>

    <!-- User avatar at bottom -->
    <div class="md:mt-2">
      <Avatar user={authStore.user} class="w-9 h-9 bg-indigo-600 text-white text-sm shadow-lg shadow-indigo-500/20 border-2 border-slate-900" />
    </div>
  </div>
</nav>
