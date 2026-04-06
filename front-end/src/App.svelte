<script lang="ts">
  import { tick, untrack } from "svelte";
  import { authStore } from "./lib/state/auth.svelte";
  import { chatStore } from "./lib/state/chat.svelte";
  import Login from "./lib/components/Login.svelte";
  import Signup from "./lib/components/Signup.svelte";
  import ChatList from "./lib/components/ChatList.svelte";
  import NotificationsDropdown from "./lib/components/NotificationsDropdown.svelte";
  import ToastContainer from "./lib/components/ToastContainer.svelte";
  import Avatar from "./lib/components/Avatar.svelte";

  import { routerStore } from "./lib/state/router.svelte";
  import IconRail from "./lib/components/IconRail.svelte";
  import ConversationsPanel from "./lib/components/ConversationsPanel.svelte";
  import ProfilePanel from "./lib/components/ProfilePanel.svelte";
  import SettingsPanel from "./lib/components/SettingsPanel.svelte";
  import RequestsPanel from "./lib/components/RequestsPanel.svelte";

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  // State
  let selectedOtherUser: any = $state(null);
  let selectedChatStatus: string = $state("");

  let notificationsOpen = $state(false);
  let unreadNotifications = $state(0);
  let messageInput = $state("");
  let messagesContainer: HTMLDivElement | undefined = $state();
  let toastContainer: ToastContainer | undefined = $state();

  let activePanel = $derived(
    (routerStore.segments[1] as PanelId) || "conversations",
  );
  let selectedChatId = $derived(routerStore.segments[2] || null);
  let isSidebarCollapsed = $state(false);

  $effect(() => {
    if (typeof localStorage !== "undefined") {
      const savedTheme = localStorage.getItem("theme") || "dark";
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  });

  // Handle router init and auth check transition
  $effect(() => {
    // Only track isCheckingAuth
    const _checking = authStore.isCheckingAuth;
    untrack(() => {
      routerStore.init();
      if (!_checking) {
        // Re-trigger routing to apply guards now that we know the user state
        routerStore.updateFromHash?.();
      }
    });
  });

  const handleSelectChat = (chatId: string, otherUser: any, status: string) => {
    selectedOtherUser = otherUser;
    selectedChatStatus = status;
    routerStore.navigate(`/chat/conversations/${chatId}`);
    if (status === "accepted") {
      chatStore.loadMessages(chatId);
      chatStore.markChatRead(chatId);
    }
  };

  // Sync with auth state and connect socket when entering chat view
  $effect(() => {
    if (authStore.user && routerStore.segments[0] === "chat") {
      chatStore.connect();
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

  // Auto-scroll when messages change
  $effect(() => {
    const _len = chatStore.messages.length;
    tick().then(() => {
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    });
  });

  const toggleView = (newView: string) => {
    routerStore.navigate(newView === "LOGIN" ? "/login" : "/signup");
    authStore.error = null;
  };

  const handleLogout = async () => {
    chatStore.disconnect();
    await authStore.logout();
    routerStore.navigate('/login');
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedChatId || !selectedOtherUser?.id)
      return;
    chatStore.sendMessage(selectedChatId, selectedOtherUser.id, messageInput);
    messageInput = "";
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const timeAgo = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const seconds = Math.max(
      0,
      Math.floor((new Date().getTime() - d.getTime()) / 1000),
    );
    if (seconds < 60) return `just now`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  const handleInput = () => {
    if (selectedChatId && selectedOtherUser?.id) {
      chatStore.emitTyping(selectedChatId, selectedOtherUser.id, true);
    }
  };

  const handleMessagesScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    if (
      target.scrollTop < 50 &&
      chatStore.hasMoreMessages &&
      !chatStore.isLoadingMessages
    ) {
      const scrollBottom = target.scrollHeight - target.scrollTop;
      chatStore.loadOlderMessages().then(() => {
        setTimeout(() => {
          if (messagesContainer) {
            messagesContainer.scrollTop =
              messagesContainer.scrollHeight - scrollBottom;
          }
        }, 0);
      });
    }
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  const handleNotificationNavigate = (type: string, referenceId: string) => {
    let routePanel: "conversations" | "requests" = "conversations";
    let status = "accepted";

    if (type === "chat_request") {
      routePanel = "requests";
      status = "pending";
    } else if (type === "request_accepted") {
      routePanel = "conversations";
      status = "accepted";
    } else if (type === "request_rejected") {
      routePanel = "requests";
      status = "rejected";
    }

    selectedOtherUser = null; // Forces a loading state or refetch if we build it later
    selectedChatStatus = status;

    routerStore.navigate(`/chat/${routePanel}/${referenceId}`);

    if (status === "accepted") {
      chatStore.loadMessages(referenceId);
      chatStore.markChatRead(referenceId);
    }
  };

  const handleToastClick = (chatId: string) => {
    selectedChatStatus = "accepted";
    routerStore.navigate(`/chat/conversations/${chatId}`);
    chatStore.loadMessages(chatId);
    chatStore.markChatRead(chatId);
  };
</script>

{#if authStore.isCheckingAuth}
  <div
    class="flex items-center justify-center w-screen h-screen bg-slate-50 dark:bg-slate-950"
  >
    <span class="loader"></span>
  </div>
{:else if routerStore.segments[0] === "chat" && authStore.user}
  <main
    class="flex flex-col w-screen h-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
  >
    <NotificationsDropdown
      bind:isOpen={notificationsOpen}
      bind:unreadCount={unreadNotifications}
      onNavigate={handleNotificationNavigate}
    />

    <!-- Body: Rail + Sub-Panel + Chat -->
    <div class="flex flex-1 min-h-0">
      <!-- Icon Rail -->
      <IconRail
        {activePanel}
        onPanelSelect={(p) => routerStore.navigate(`/chat/${p}`)}
        onNotificationToggle={() => (notificationsOpen = !notificationsOpen)}
        notificationCount={unreadNotifications}
        onLogout={handleLogout}
      />

      <!-- Sub Panel Area -->
      <aside
        class="glass-panel flex flex-col z-10 shrink-0 transition-all duration-300 {isSidebarCollapsed
          ? 'w-0 opacity-0 border-none overflow-hidden'
          : 'w-[280px] border-r'}"
      >
        {#if activePanel === "conversations"}
          <ConversationsPanel
            activeChatId={selectedChatId}
            onSelectChat={handleSelectChat}
          />
        {:else if activePanel === "profile"}
          <ProfilePanel />
        {:else if activePanel === "settings"}
          <SettingsPanel />
        {:else if activePanel === "requests"}
          <RequestsPanel />
        {/if}
      </aside>

      <section
        class="flex-1 flex flex-col relative bg-slate-100/50 dark:bg-slate-950/30 {selectedChatId
          ? ''
          : 'justify-center items-center'}"
      >
        {#if selectedChatId}
          <div class="glass-panel p-4 border-b">
            <div class="flex items-center gap-3">
              <button
                class="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/10 transition-all mr-2"
                onclick={() => (isSidebarCollapsed = !isSidebarCollapsed)}
                aria-label="Toggle Sidebar"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  ><rect x="3" y="3" width="18" height="18" rx="2" ry="2"
                  ></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg
                >
              </button>
              <Avatar user={selectedOtherUser} class="w-9 h-9 bg-indigo-500 text-white text-sm" />
              <div>
                <h3
                  class="m-0 text-lg font-semibold leading-none"
                  title="@{selectedOtherUser?.username}"
                >
                  {selectedOtherUser?.name || selectedOtherUser?.username}
                </h3>
                {#if selectedChatStatus === "pending"}
                  <span
                    class="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500"
                    >Pending</span
                  >
                {:else}
                  <div class="flex items-center gap-1.5 mt-1">
                    {#if chatStore.onlineStatus[selectedOtherUser?.id]?.isOnline}
                      <span
                        class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                      ></span><span class="text-xs text-emerald-500 font-medium"
                        >Online</span
                      >
                    {:else if chatStore.onlineStatus[selectedOtherUser?.id]?.lastSeen}
                      <span class="text-xs text-slate-500"
                        >Last seen {timeAgo(
                          chatStore.onlineStatus[selectedOtherUser?.id]
                            .lastSeen as Date,
                        )}</span
                      >
                    {:else}
                      <span class="text-xs text-slate-500">Offline</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          </div>

          {#if selectedChatStatus === "pending"}
            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              <div
                class="flex flex-col items-center justify-center gap-4 h-full text-slate-500 text-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-amber-500 opacity-70"
                  ><circle cx="12" cy="12" r="10"></circle><polyline
                    points="12 6 12 12 16 14"
                  ></polyline></svg
                >
                <h3
                  class="text-xl text-slate-900 dark:text-slate-100 font-bold"
                >
                  Waiting for response
                </h3>
                <p class="text-sm max-w-[280px]">
                  Messages will be available once the request is accepted.
                </p>
              </div>
            </div>
          {:else if selectedChatStatus === "rejected"}
            <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
              <div
                class="flex flex-col items-center justify-center gap-4 h-full text-slate-500 text-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-rose-500 opacity-70"
                  ><circle cx="12" cy="12" r="10"></circle><line
                    x1="15"
                    y1="9"
                    x2="9"
                    y2="15"
                  ></line><line x1="9" y1="9" x2="15" y2="15"></line></svg
                >
                <h3
                  class="text-xl text-slate-900 dark:text-slate-100 font-bold"
                >
                  Request Rejected
                </h3>
                <p class="text-sm max-w-[280px]">
                  This chat request was declined or the conversation was ended.
                </p>
              </div>
            </div>
          {:else}
            <div
              class="flex-1 overflow-y-auto p-6 flex flex-col gap-2"
              bind:this={messagesContainer}
              onscroll={handleMessagesScroll}
            >
              {#if chatStore.isLoadingMessages}
                <div class="text-center text-xs p-4 mb-auto text-slate-500">
                  Loading messages...
                </div>
              {/if}

              {#if chatStore.messages.length === 0 && !chatStore.isLoadingMessages}
                <div class="text-center text-sm text-slate-500 mt-4">
                  No messages yet. Send a message to start!
                </div>
              {:else}
                {#each chatStore.messages as msg, i}
                  {@const currentDateLabel = getDateLabel(msg.createdAt)}
                  {@const prevDateLabel =
                    i > 0
                      ? getDateLabel(chatStore.messages[i - 1].createdAt)
                      : null}

                  {#if currentDateLabel !== prevDateLabel}
                    <div
                      class="text-center my-6 relative flex items-center justify-center before:content-[''] before:absolute before:top-1/2 before:left-0 before:right-0 before:h-px before:bg-slate-200 dark:before:bg-white/10 before:z-0"
                    >
                      <span
                        class="relative z-10 px-4 py-1 text-[10px] uppercase tracking-widest font-bold text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full"
                        >{currentDateLabel}</span
                      >
                    </div>
                  {/if}

                  <div
                    class="chat-bubble {msg.senderId === authStore.user?.id
                      ? 'chat-bubble-sent'
                      : 'chat-bubble-received'}"
                  >
                    <p class="m-0 text-sm leading-relaxed wrap-break-word">
                      {msg.contentBody}
                    </p>
                    <span class="block text-[10px] opacity-70 mt-1 text-right"
                      >{formatTime(msg.createdAt)}</span
                    >
                  </div>
                {/each}
              {/if}
            </div>

            {#if chatStore.typingStatus[selectedChatId]?.size > 0}
              {#if !chatStore.typingStatus[selectedChatId].has(authStore.user?.id) || chatStore.typingStatus[selectedChatId].size > 1}
                <div class="px-6 pb-2">
                  <span class="text-xs text-slate-500 italic"
                    >{selectedOtherUser?.name || selectedOtherUser?.username} is
                    typing...</span
                  >
                </div>
              {/if}
            {/if}

            <div class="p-4 glass-panel border-t flex gap-3 items-center">
              <input
                type="text"
                placeholder="Type a message..."
                class="input-field flex-1 rounded-full! px-5 py-2.5"
                bind:value={messageInput}
                onkeydown={handleKeydown}
                oninput={handleInput}
              />
              <button
                class="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                aria-label="Send message"
                onclick={handleSendMessage}
                disabled={!messageInput.trim()}
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
                  ><line x1="22" y1="2" x2="11" y2="13"></line><polygon
                    points="22 2 15 22 11 13 2 9 22 2"
                  ></polygon></svg
                >
              </button>
            </div>
          {/if}
        {:else}
          <div
            class="flex flex-col items-center justify-center gap-4 text-slate-500 text-center h-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="text-indigo-500 opacity-80 mb-2"
              ><path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              ></path></svg
            >
            <h3 class="text-2xl text-slate-900 dark:text-slate-100 font-bold">
              Welcome to your Dashboard
            </h3>
            <p class="text-base max-w-[300px]">
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
    class="flex items-center justify-center w-screen h-screen bg-slate-50 dark:bg-slate-950 font-sans"
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
