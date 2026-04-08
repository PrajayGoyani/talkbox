<script lang="ts">
  import { tick, untrack } from "svelte";
  import { fade, fly, slide } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { authStore } from "./lib/state/auth.svelte";
  import { chatStore, type User } from "./lib/state/chat.svelte";
  import { notificationStore } from "./lib/state/notification.svelte";
  import Login from "./lib/components/Login.svelte";
  import Signup from "./lib/components/Signup.svelte";
  import ChatList from "./lib/components/ChatList.svelte";
  import NotificationsDropdown from "./lib/components/NotificationsDropdown.svelte";
  import ToastContainer from "./lib/components/ToastContainer.svelte";
  import Avatar from "./lib/components/Avatar.svelte";
  import { themeStore } from "./lib/state/theme.svelte";

  import { routerStore } from "./lib/state/router.svelte";
  import { Route } from "./lib/utils/routes";
  import { storage } from "./lib/utils/storage";
  import IconRail from "./lib/components/IconRail.svelte";
  import ConversationsPanel from "./lib/components/ConversationsPanel.svelte";
  import ProfilePanel from "./lib/components/ProfilePanel.svelte";
  import SettingsPanel from "./lib/components/SettingsPanel.svelte";
  import RequestsPanel from "./lib/components/RequestsPanel.svelte";
  import ChatWindow from "./lib/components/ChatWindow.svelte";
  import Terms from "./lib/components/Terms.svelte";
  import Privacy from "./lib/components/Privacy.svelte";
  import Home from "./lib/components/Home.svelte";
  import ThemeToggle from "./lib/components/ThemeToggle.svelte";

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  // State
  // Derived state for current chat
  const selectedChat = $derived(
    chatStore.chats.find((c) => c.id === selectedChatId) || null,
  );
  let selectedOtherUser = $derived(selectedChat?.otherUser || null);
  let selectedChatStatus = $derived(selectedChat?.status || "");

  let notificationsOpen = $state(false);
  let unreadNotifications = $derived(notificationStore.unreadCount);
  let toastContainer: ToastContainer | undefined = $state();

  let activePanel = $derived(
    (routerStore.segments[1] as PanelId) || "conversations",
  );
  let selectedChatId = $derived(routerStore.segments[2] || null);
  let isSidebarCollapsed = $state(false);
  let isDocPage = $derived(
    routerStore.segments[0] === "terms" || routerStore.segments[0] === "privacy",
  );

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

  const handleSelectChat = (chatId: string) => {
    routerStore.navigate(`${Route.CONVERSATIONS}/${chatId}`);
  };

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

  // Sync with auth state and connect socket when authenticated
  $effect(() => {
    if (authStore.user) {
      chatStore.connect();
      // Ensure chats are fetched on mount/re-auth
      chatStore.fetchChats();

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

    routerStore.navigate(`${Route.CHAT}/${routePanel}/${referenceId}`);
  };

  const handleToastClick = (chatId: string) => {
    routerStore.navigate(`${Route.CONVERSATIONS}/${chatId}`);
    chatStore.loadMessages(chatId);
    chatStore.markChatRead(chatId);
  };
</script>

{#if authStore.isCheckingAuth}
  <div
    class="flex items-center justify-center w-screen h-dvh bg-slate-50 dark:bg-slate-950"
  >
    <span class="loader"></span>
  </div>
{:else if routerStore.segments[0] === "chat" && authStore.user}
  <main
    class="flex flex-col w-screen h-dvh overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
  >
    <NotificationsDropdown
      bind:isOpen={notificationsOpen}
      bind:unreadCount={unreadNotifications}
      onNavigate={handleNotificationNavigate}
    />

    <!-- Body: Rail + Sub-Panel + Chat -->
    <div
      class="flex flex-col md:flex-row flex-1 min-h-0 relative w-full overflow-hidden"
    >
      <!-- Icon Rail -->
      <IconRail
        {activePanel}
        onPanelSelect={(p) => routerStore.navigate(`/chat/${p}`)}
        onNotificationToggle={() => (notificationsOpen = !notificationsOpen)}
        notificationCount={unreadNotifications}
        onLogout={handleLogout}
        hideOnMobile={!!selectedChatId}
      />

      <!-- Sub Panel Area -->
      <aside
        class="glass-panel flex-col z-10 min-h-0 shrink-0 transition-all duration-300 {isSidebarCollapsed
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
                onSelectChat={handleSelectChat}
                unreadCount={unreadNotifications}
                onNotificationToggle={() =>
                  (notificationsOpen = !notificationsOpen)}
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
            bind:isSidebarCollapsed
            onBack={() => routerStore.navigate("/chat/" + activePanel)}
          />
        {:else}
          <div
            class="flex flex-col items-center justify-center gap-4 text-slate-500 text-center h-full"
          >
            <p class="text-base max-w-[300px]">
              <!-- Select a conversation from the sidebar or start a new one to begin chatting. -->
              Select a conversation from the sidebar or start a new one.
            </p>
          </div>
        {/if}
      </section>
    </div>
    <ToastContainer
      bind:this={toastContainer}
      onToastClick={handleToastClick}
    />
  </main>
{:else}
  <div
    class="flex flex-col w-screen h-dvh bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden overflow-x-hidden"
  >
    <!-- Guest Header -->
    <header
      class="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md z-50"
    >
      <div
        class="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between"
      >
        <button
          onclick={() => routerStore.navigate("/")}
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
          <!-- Features/FAQ links only on Home -->
          {#if routerStore.segments.length === 0 || routerStore.segments[0] === "features" || routerStore.segments[0] === "faq"}
            <nav
              class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 mr-4"
            >
              <a
                href="#features"
                class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >Features</a
              >
              <a
                href="#faq"
                class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >FAQ</a
              >
            </nav>
          {/if}

          <ThemeToggle />

          {#if !routerStore.segments.includes("login") && !routerStore.segments.includes("signup")}
            {#if authStore.user}
              <button
                onclick={() => routerStore.navigate(Route.CONVERSATIONS)}
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
              >
                Go to Dashboard
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
                >
              </button>
            {:else}
              <button
                onclick={() => routerStore.navigate(Route.LOGIN)}
                class="hidden sm:block text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 px-2 active:scale-95"
              >
                Log In
              </button>
              <button
                onclick={() => routerStore.navigate(Route.SIGNUP)}
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
              >
                Sign Up
              </button>
            {/if}
          {/if}
        </div>
      </div>
    </header>

    <!-- Content -->
    <div
      class="flex-1 overflow-y-auto w-full flex flex-col {isDocPage
        ? 'block'
        : 'items-center p-4 sm:p-8'}"
    >
      {#if routerStore.segments[0] === "login"}
        <div class="w-full flex justify-center py-8 my-auto">
          <Login>
            {#snippet toggleSignup()}
              <button
                class="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                onclick={() => toggleView("SIGNUP")}
              >
                Sign up
              </button>
            {/snippet}
          </Login>
        </div>
      {:else if routerStore.segments[0] === "signup"}
        <div class="w-full flex justify-center py-8 my-auto">
          <Signup>
            {#snippet toggleLogin()}
              <button
                class="text-indigo-600 hover:text-indigo-500 font-medium transition-colors"
                onclick={() => toggleView("LOGIN")}
              >
                Log in
              </button>
            {/snippet}
          </Signup>
        </div>
      {:else if routerStore.segments[0] === "terms"}
        <div class="w-full">
          <Terms />
        </div>
      {:else if routerStore.segments[0] === "privacy"}
        <div class="w-full">
          <Privacy />
        </div>
      {:else}
        <div class="w-full h-full">
          <Home />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Base styles moved to app.css */
</style>
