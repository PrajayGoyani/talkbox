<script lang="ts">
  import { untrack } from "svelte";
  import { quintOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import Login from "./lib/components/auth/Login.svelte";
  import Signup from "./lib/components/auth/Signup.svelte";
  import NotificationsDropdown from "./lib/components/layout/NotificationsDropdown.svelte";
  import ToastContainer from "./lib/components/layout/ToastContainer.svelte";
  import { authStore } from "./lib/state/auth.svelte";
  import { chatStore } from "./lib/state/chat.svelte";
  import { notificationStore } from "./lib/state/notification.svelte";
  import { themeStore } from "./lib/state/theme.svelte";

  import ChatWindow from "./lib/components/chat/ChatWindow.svelte";
  import ConversationsPanel from "./lib/components/chat/ConversationsPanel.svelte";
  import IconRail from "./lib/components/layout/IconRail.svelte";
  import ProfilePanel from "./lib/components/panels/ProfilePanel.svelte";
  import RequestsPanel from "./lib/components/panels/RequestsPanel.svelte";
  import SettingsPanel from "./lib/components/panels/SettingsPanel.svelte";
  import GlobalTooltip from "./lib/components/ui/GlobalTooltip.svelte";
  import Icon from "./lib/components/ui/Icon.svelte";
  import Spinner from "./lib/components/ui/Spinner.svelte";
  import ThemeToggle from "./lib/components/ui/ThemeToggle.svelte";
  import Home from "./lib/components/views/Home.svelte";
  import Privacy from "./lib/components/views/Privacy.svelte";
  import Terms from "./lib/components/views/Terms.svelte";
  import { routerStore } from "./lib/state/router.svelte";
  import { uiStore } from "./lib/state/ui.svelte";
  import { Route } from "./lib/utils/routes";

  let isHomePage = $derived(routerStore.segments.length === 0);

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  // State
  // Derived state for current chat
  const selectedChat = $derived(
    chatStore.chats.find((c) => c.id === selectedChatId) || null,
  );
  let selectedOtherUser = $derived(selectedChat?.otherUser || null);
  let selectedChatStatus = $derived(selectedChat?.status || "");

  let toastContainer: ToastContainer | undefined = $state();

  let activePanel = $derived(
    (routerStore.segments[1] as PanelId) || "conversations",
  );
  let selectedChatId = $derived(routerStore.segments[2] || null);
  let isDocPage = $derived(
    routerStore.segments[0] === "terms" ||
      routerStore.segments[0] === "privacy",
  );

  // Sync current chat messages when URL param changes (including on mount/refresh)
  $effect(() => {
    const chatId = selectedChatId;
    if (chatId && authStore.user) {
      untrack(() => {
        chatStore.loadMessages(chatId);
        chatStore.markChatRead(chatId);
      });
    }
  });

  $effect(() => {
    // Apply theme reactively
    document.documentElement.setAttribute("data-theme", themeStore.theme);

    // Initialize router once
    routerStore.init();

    // If auth check completes, ensure router forces an update to apply guards
    if (!authStore.isCheckingAuth) {
      untrack(() => routerStore.updateFromHash());
    }
  });

  // Sync with auth state and connect socket when authenticated
  $effect(() => {
    if (authStore.user) {
      chatStore.connect();
      // Ensure chats and requests are fetched on mount/re-auth
      chatStore.fetchChats();
      chatStore.fetchRequests();

      // Register toast callback
      chatStore.onToast((data) => {
        if (toastContainer) {
          toastContainer.addToast(data);
        }
      });
    } else if (!authStore.user && !authStore.isCheckingAuth) {
      chatStore.disconnect();
    }
  });

  const toggleView = (newView: string) => {
    routerStore.navigate(newView === "LOGIN" ? Route.LOGIN : Route.SIGNUP);
    authStore.error = null;
  };

  const handleLogout = async () => {
    chatStore.disconnect();
    await authStore.logout();
    routerStore.navigate(Route.LOGIN);
  };

  const handleNotificationNavigate = (type: string, referenceId: string) => {
    let routePanel: "conversations" | "requests" = "conversations";
    if (type === "chat_request") {
      routePanel = "requests";
    }

    uiStore.navigate(`${Route.CHAT}/${routePanel}/${referenceId}`);
  };

  const handleToastClick = (chatId: string) => {
    routerStore.navigate(`${Route.CONVERSATIONS}/${chatId}`);
    chatStore.loadMessages(chatId);
    chatStore.markChatRead(chatId);
  };
</script>

{#if authStore.isCheckingAuth}
  {@render LoadingState()}
{:else if routerStore.segments[0] === "chat" && authStore.user}
  {@render AuthenticatedApp()}
{:else}
  {@render GuestApp()}
{/if}

<!-- Snippets for clear logical separation -->

{#snippet LoadingState()}
  <div
    class="flex flex-col items-center justify-center w-screen h-dvh bg-slate-50 dark:bg-slate-950 gap-4"
  >
    <div role="status">
      <Spinner class="w-8 h-8 text-slate-200 dark:text-white/10 fill-indigo-500 animate-spin" />
      <span class="sr-only">Loading...</span>
    </div>

    {#if authStore.isSlowBoot}
      <p
        class="text-slate-500 dark:text-slate-400 text-sm animate-pulse font-medium"
        transition:fade
      >
        Please wait, server is booting up.
      </p>
    {/if}
  </div>
{/snippet}

{#snippet AuthenticatedApp()}
  <main
    class="flex flex-col w-screen h-dvh overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
  >
    <NotificationsDropdown
      bind:isOpen={uiStore.notificationsOpen}
      onNavigate={handleNotificationNavigate}
    />

    <div
      class="flex flex-col md:flex-row flex-1 min-h-0 relative w-full overflow-hidden"
    >
      <IconRail
        {activePanel}
        onPanelSelect={(p) => uiStore.navigate(`/chat/${p}`)}
        onNotificationToggle={() => uiStore.toggleNotifications()}
        notificationCount={notificationStore.unreadCount}
        requestsCount={chatStore.pendingRequestCount}
        onLogout={handleLogout}
        hideOnMobile={!!selectedChatId}
      />

      <aside
        class="glass-panel flex-col z-10 min-h-0 shrink-0 transition-all duration-300 {uiStore.isSidebarCollapsed
          ? 'w-0 opacity-0 border-none overflow-hidden hidden md:flex'
          : 'w-full md:w-[280px] border-r'} {selectedChatId
          ? 'hidden md:flex'
          : 'flex flex-1 md:flex-initial'}"
      >
        {#key activePanel}
          <div
            in:fly={{ x: -20, duration: 300, delay: 150, easing: quintOut }}
            out:fade={{ duration: 150 }}
            class="flex flex-col h-full overflow-hidden"
          >
            {#if activePanel === "conversations"}
              <ConversationsPanel
                activeChatId={selectedChatId}
                onSelectChat={(id) =>
                  uiStore.navigate(`${Route.CONVERSATIONS}/${id}`, {
                    resetSidebar: false,
                  })}
                unreadCount={notificationStore.unreadCount}
                onNotificationToggle={() => uiStore.toggleNotifications()}
              />
            {:else if activePanel === "profile"}
              <ProfilePanel />
            {:else if activePanel === "settings"}
              <SettingsPanel user={authStore.user} onLogout={handleLogout} />
            {:else if activePanel === "requests"}
              <RequestsPanel />
            {/if}
          </div>
        {/key}
      </aside>

      <section
        class="flex-1 min-h-0 flex flex-col relative bg-slate-100/50 dark:bg-slate-950/30 {selectedChatId
          ? 'flex'
          : 'hidden md:flex flex-col justify-center items-center'}"
      >
        {#if selectedChatId}
          <ChatWindow
            chatId={selectedChatId}
            otherUser={selectedOtherUser}
            status={selectedChatStatus}
            bind:isSidebarCollapsed={uiStore.isSidebarCollapsed}
            onBack={() => uiStore.navigate("/chat/" + activePanel)}
          />
        {:else}
          <div
            class="flex flex-col items-center justify-center gap-4 text-slate-500 text-center h-full"
          >
            <p class="text-base max-w-[300px]">
              Select a conversation from the sidebar or start a new one to begin
              chatting.
            </p>
          </div>
        {/if}
      </section>
    </div>
    <ToastContainer
      bind:this={toastContainer}
      onToastClick={(id) => uiStore.navigate(`${Route.CONVERSATIONS}/${id}`)}
    />
  </main>
{/snippet}

{#snippet GuestApp()}
  <div
    class="flex flex-col w-screen h-dvh bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden"
  >
    <!-- Guest Header -->
    <header
      class="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md z-50"
    >
      <div
        class="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between"
      >
        <button
          onclick={() => uiStore.navigate("/")}
          class="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 active:scale-95"
        >
          <div
            class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0"
          >
            <span class="text-white font-bold text-xl">T</span>
          </div>
          <span
            class="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-slate-100"
            >Talkbox</span
          >
        </button>

        <div class="flex items-center gap-4">
          {#if routerStore.segments.length === 0}
            <nav
              class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 mr-4"
            >
              <a
                href="#features"
                class="hover:text-indigo-600 transition-colors">Features</a
              >
              <a href="#faq" class="hover:text-indigo-600 transition-colors"
                >FAQ</a
              >
            </nav>
          {/if}

          <ThemeToggle />

          {#if authStore.user}
            <button
              onclick={() => uiStore.navigate(Route.CHAT + "/conversations")}
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
            >
              Go to Dashboard
              <Icon name="chevron-right" class="w-4 h-4" />
            </button>
          {:else}
            <button
              onclick={() => uiStore.navigate(Route.LOGIN)}
              class="hidden sm:block text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 px-2 active:scale-95"
            >
              Log In
            </button>
            <button
              onclick={() => uiStore.navigate(Route.SIGNUP)}
              class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              Sign Up
            </button>
          {/if}
        </div>
      </div>
    </header>

    <!-- Content -->
    <div
      class="flex-1 overflow-y-auto w-full flex flex-col {isDocPage ||
      isHomePage
        ? 'block'
        : 'items-center p-4 sm:p-8'}"
    >
      {#if routerStore.segments[0] === "login"}
        <div class="w-full flex justify-center py-8 my-auto">
          <Login>
            {#snippet toggleSignup()}
              <button
                class="text-indigo-600 font-medium"
                onclick={() => toggleView("SIGNUP")}>Sign up</button
              >
            {/snippet}
          </Login>
        </div>
      {:else if routerStore.segments[0] === "signup"}
        <div class="w-full flex justify-center py-8 my-auto">
          <Signup>
            {#snippet toggleLogin()}
              <button
                class="text-indigo-600 font-medium"
                onclick={() => toggleView("LOGIN")}>Log in</button
              >
            {/snippet}
          </Signup>
        </div>
      {:else if routerStore.segments[0] === "terms"}
        <Terms />
      {:else if routerStore.segments[0] === "privacy"}
        <Privacy />
      {:else}
        <Home />
      {/if}
    </div>
  </div>
{/snippet}

<GlobalTooltip />

<style>
  /* Base styles moved to app.css */
</style>
