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

  import { routerStore } from "./lib/state/router.svelte";
  import { Route } from "./lib/utils/routes";
  import { storage } from "./lib/utils/storage";
  import IconRail from "./lib/components/IconRail.svelte";
  import ConversationsPanel from "./lib/components/ConversationsPanel.svelte";
  import ProfilePanel from "./lib/components/ProfilePanel.svelte";
  import SettingsPanel from "./lib/components/SettingsPanel.svelte";
  import RequestsPanel from "./lib/components/RequestsPanel.svelte";
  import ChatWindow from "./lib/components/ChatWindow.svelte";

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
    (routerStore.segments[1] as PanelId) || "conversations"
  );
  let selectedChatId = $derived(routerStore.segments[2] || null);
  let isSidebarCollapsed = $state(false);

  $effect(() => {
    // Apply theme
    document.documentElement.setAttribute("data-theme", storage.getTheme());
    
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
    <div class="flex flex-col md:flex-row flex-1 min-h-0 relative w-full overflow-hidden">
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
          : 'w-full md:w-[280px] border-r'} {selectedChatId ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'}"
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
                onNotificationToggle={() => (notificationsOpen = !notificationsOpen)}
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
    class="flex items-center justify-center w-screen h-dvh bg-slate-50 dark:bg-slate-950 font-sans overflow-y-auto p-4"
  >
    {#if routerStore.segments[0] === "login"}
      <Login>
        {#snippet toggleSignup()}
          <button
            class="text-indigo-600 hover:text-indigo-500 font-medium transition-colors cursor-pointer"
            onclick={() => toggleView("SIGNUP")}
          >
            Sign up
          </button>
        {/snippet}
      </Login>
    {:else if routerStore.segments[0] === "signup"}
      <Signup>
        {#snippet toggleLogin()}
          <button
            class="text-indigo-600 hover:text-indigo-500 font-medium transition-colors cursor-pointer"
            onclick={() => toggleView("LOGIN")}
          >
            Log in
          </button>
        {/snippet}
      </Signup>
    {/if}
  </div>
{/if}

<style>
  /* Base styles moved to app.css */
</style>
