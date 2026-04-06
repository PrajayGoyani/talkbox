<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import Avatar from "./Avatar.svelte";

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  const {
    activePanel,
    onPanelSelect,
    onNotificationToggle,
    notificationCount = 0,
    onLogout,
  } = $props<{
    activePanel: PanelId;
    onPanelSelect: (panel: PanelId) => void;
    onNotificationToggle: () => void;
    notificationCount?: number;
    onLogout: () => void;
  }>();

  const displayName = $derived(
    authStore.user?.name || authStore.user?.username || "?",
  );
</script>

<nav
  class="w-[60px] h-full bg-slate-900 flex flex-col justify-between items-center py-4 border-r border-white/5 shrink-0 z-20"
>
  <div class="flex flex-col items-center gap-1">
    <!-- App Logo -->
    <div
      class="w-10 h-10 flex items-center justify-center text-indigo-500 mb-3"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        ></path>
      </svg>
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        ></path>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'profile' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("profile")}
      title="Profile"
      aria-label="Profile"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'settings' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("settings")}
      title="Settings"
      aria-label="Settings"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
        ></path>
      </svg>
    </button>

    <button
      class="rail-btn {activePanel === 'requests' ? 'rail-btn-active' : ''}"
      onclick={() => onPanelSelect("requests")}
      title="Chat Requests"
      aria-label="Chat Requests"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="20" y1="8" x2="20" y2="14"></line>
        <line x1="23" y1="11" x2="17" y2="11"></line>
      </svg>
    </button>

    <!-- Notification bell (opens right-side drawer) -->
    <button
      class="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all relative"
      onclick={onNotificationToggle}
      title="Notifications"
      aria-label="Notifications"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      {#if notificationCount > 0}
        <span
          class="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-1 shadow-sm animate-in scale-in-0 duration-300"
        >
          {notificationCount > 99 ? "99+" : notificationCount}
        </span>
      {/if}
    </button>
  </div>

  <div class="flex flex-col items-center gap-1">
    <button
      class="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
      onclick={onLogout}
      title="Log Out"
      aria-label="Log out"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
    </button>

    <!-- User avatar at bottom -->
    <Avatar user={authStore.user} class="w-9 h-9 bg-indigo-600 text-white text-sm shadow-lg shadow-indigo-500/20 border-2 border-slate-900 mt-2" />
  </div>
</nav>
