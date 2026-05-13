<script lang="ts">
  import { chatListStore } from "$state/chat/chat-list.svelte";
  import { chatActions } from "$state/chat/chat-actions.svelte";
  import { socketManager } from "$services/socket.manager.svelte";

  import NotificationsDropdown from "$components/layout/NotificationsDropdown.svelte";
  import ToastContainer from "$components/layout/ToastContainer.svelte";
  import Lazy from "$components/ui/Lazy.svelte";
  import { Views } from "$lib/views";
  import { api } from "$lib/services/api.client";
  import { authStore } from "$state/auth.svelte";
  import { notificationStore } from "$state/notification.svelte";
  import { themeStore } from "$state/theme.svelte";
  import { errorStore } from "$state/error.svelte";
  import { untrack } from "svelte";
  import { quintOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";

  import WelcomeDashboard from "$components/chat/WelcomeDashboard.svelte";
  import IconRail from "$components/layout/IconRail.svelte";
  import Alert from "$components/ui/Alert.svelte";
  import Icon from "$components/ui/Icon.svelte";
  import Spinner from "$components/ui/Spinner.svelte";
  import ThemeToggle from "$components/ui/ThemeToggle.svelte";
  import { SHOW_ENGAGING_LOADER } from "$lib/config";
  import { cn } from "$lib/utils/cn";
  import { routerStore } from "$state/router.svelte";
  import { uiStore } from "$state/ui.svelte";
  import { Route } from "$utils/routes";

  let isHomePage = $derived(routerStore.segments.length === 0);

  type PanelId = "conversations" | "profile" | "settings" | "requests";

  let toastContainer: ToastContainer | undefined = $state();

  let activePanel = $derived((routerStore.segments[1] as PanelId) || "conversations");
  let selectedChatId = $derived(routerStore.segments[2] || null);

  // Derived state for current chat
  let hasStartedInitialLoad = $state(false);
  $effect(() => {
    if (chatListStore.isLoadingChats) {
      hasStartedInitialLoad = true;
    }
  });

  const isInitialChatListLoad = $derived(
    !hasStartedInitialLoad || (chatListStore.isLoadingChats && chatListStore.chats.length === 0),
  );
  const selectedChat = $derived(selectedChatId ? chatListStore.chatsMap.get(selectedChatId) || null : null);
  let selectedOtherUser = $derived(selectedChat?.otherUser || null);
  let selectedChatStatus = $derived(selectedChat?.status || "");
  const validSegments = new Set(["terms", "privacy", "faq"]);
  let isDocPage = $derived(validSegments.has(routerStore.segments[0]));
  const GUEST_VIEW_CONFIG: Record<string, { component: any; centered?: boolean }> = {
    login: { component: Views.Login, centered: true },
    signup: { component: Views.Signup, centered: true },
    "forgot-password": { component: Views.ForgotPassword, centered: true },
    "reset-password": { component: Views.ResetPassword, centered: true },
    "verify-email": { component: Views.VerifyEmail, centered: true },
    terms: { component: Views.Terms },
    privacy: { component: Views.Privacy },
    pricing: { component: Views.Pricing },
    faq: { component: Views.FAQ },
  };

  const QUOTES = [
    {
      text: "Good words are worth much, and cost little.",
      author: "George Herbert",
    },
    {
      text: "The art of communication is the language of leadership.",
      author: "James Humes",
    },
    {
      text: "The most important thing in communication is hearing what isn't said.",
      author: "Peter Drucker",
    },
    {
      text: "Every great conversation starts with a simple 'Hello'.",
      author: "",
    },
    {
      text: "The single biggest problem in communication is the illusion that it has taken place.",
      author: "George Bernard Shaw",
    },
    { text: "Connect. Chat. Collaborate.", author: "Talkbox" },
    {
      text: "Words are, of course, the most powerful drug used by mankind.",
      author: "Rudyard Kipling",
    },
    // FUTURE CONSIDERATION: Mix in 'Pro Tips' to help users discover features
    // {
    //   text: "Tip: You can use @mentions to get someone's attention in a group chat.",
    //   author: "Talkbox Pro Tip",
    // },
    // {
    //   text: "Tip: Check out the 'Pricing' tab for advanced collaboration features.",
    //   author: "Talkbox Pro Tip",
    // },
  ];

  let currentQuote = $state<{ text: string; author?: string }>(QUOTES[0]);

  /**
   * Fetches dynamic quotes from the backend.
   */
  async function fetchDynamicQuote() {
    try {
      const data = await api.get<{ text: string; author?: string }>("/public/quote", {
        // Use a signal to allow cancellation if needed
        signal: AbortSignal.timeout(2000),
      });
      if (data) {
        currentQuote = data;
      }
    } catch (e: any) {
      // Fallback is handled by the initial state and $effect
    }
  }

  $effect(() => {
    if (authStore.isSlowBoot) {
      // Pick a random one from static list immediately for zero-latency feedback
      currentQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

      // Then try to fetch a fresh one (or a critical announcement) from the backend
      const timer = setTimeout(() => {
        // fetchDynamicQuote(); // Note: do not remove
        currentQuote = {
          text: "Connect. Chat. Collaborate.",
          author: "Talkbox",
        };
      }, 10000);

      return () => clearTimeout(timer);
    }
  });

  // Sync current chat messages when URL param changes (including on mount/refresh)
  $effect(() => {
    const chatId = selectedChatId;
    // If the chat list is still loading its first batch, wait before loading messages.
    // This ensures we have the chat metadata (like otherUser) before we fetch messages.
    if (chatId && authStore.user && !isInitialChatListLoad) {
      untrack(() => {
        chatActions.loadMessages(chatId);
      });
    }
  });

  $effect(() => {
    // Eager load Home component immediately in the background
    // This happens while authStore.isCheckingAuth is true (initial loader)
    Views.Home();
    Views.Login();
    Views.Signup();
    Views.Pricing();

    // Apply theme reactively
    document.documentElement.setAttribute("data-theme", themeStore.theme);

    // Initialize router once
    routerStore.init();

    // If auth check completes, ensure router forces an update to apply guards
    if (!authStore.isCheckingAuth) {
      untrack(() => routerStore.updateFromHash());
    }
  });

  // Sync with auth state when authenticated
  $effect(() => {
    if (authStore.user) {
      // Register toast callback
      const cleanupToast = chatActions.onToast((data) => {
        if (toastContainer) {
          toastContainer.addToast(data);
        }
      });

      // Eager load authenticated components to improve perceived performance
      Views.ProfilePanel();
      Views.RequestsPanel();
      Views.SettingsPanel();
      Views.ChatWindow();
      Views.ChatPartnerProfile();

      return () => {
        cleanupToast();
      };
    }
  });

  const toggleView = (newView: string) => {
    routerStore.navigate(newView === "LOGIN" ? Route.LOGIN : Route.SIGNUP);
    authStore.error = null;
  };

  const handleLogout = async () => {
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
    chatActions.loadMessages(chatId);
    chatActions.markChatRead(chatId);
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
  <div class="flex flex-col items-center justify-center w-screen h-dvh bg-slate-50 dark:bg-slate-950 gap-4">
    <div role="status">
      <Spinner class="w-8 h-8 text-slate-200 dark:text-white/10 fill-indigo-500 animate-spin" />
      <span class="sr-only">Loading...</span>
    </div>

    {#if authStore.isSlowBoot}
      {#if SHOW_ENGAGING_LOADER}
        <div class="flex flex-col items-center gap-2 max-w-sm px-6 text-center" transition:fade={{ duration: 400 }}>
          <p class="text-slate-600 dark:text-slate-300 text-sm italic font-medium leading-relaxed">
            "{currentQuote.text}"
          </p>
          {#if currentQuote.author}
            <span class="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
              — {currentQuote.author}
            </span>
          {/if}
          <div class="mt-4 flex items-center gap-2">
            <div class="flex gap-1">
              <div class="w-1 h-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></div>
              <div class="w-1 h-1 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]"></div>
              <div class="w-1 h-1 rounded-full bg-indigo-500 animate-bounce"></div>
            </div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter animate-pulse">
              Booting Server
            </span>
          </div>
        </div>
      {:else}
        <p class="text-slate-500 dark:text-slate-400 text-sm animate-pulse font-medium" transition:fade>
          Please wait, server is booting up.
        </p>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet AuthenticatedApp()}
  <main
    class="flex flex-col w-screen h-dvh overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
  >
    <NotificationsDropdown bind:isOpen={uiStore.notificationsOpen} onNavigate={handleNotificationNavigate} />

    {#if authStore.user && !authStore.user.isEmailVerified && false}
      <!-- TODO: should we verify the this at login time? -->
      <div
        class="shrink-0 bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-3 text-sm text-amber-700 dark:text-amber-400"
      >
        <Icon name="mail" class="w-4 h-4 shrink-0" />
        <span>Please verify your email. Check your inbox.</span>
        <button
          class="text-xs font-bold underline hover:no-underline ml-1"
          onclick={() => authStore.resendVerification()}
        >
          Resend
        </button>
      </div>
    {/if}

    <div class="flex flex-col md:flex-row flex-1 min-h-0 relative w-full overflow-hidden">
      <IconRail
        {activePanel}
        onPanelSelect={(p: string) => {
          if (p === "pricing") {
            routerStore.navigate("/pricing");
            return;
          }

          // On desktop, preserve the active chat when switching menus
          const isDesktop = uiStore.windowWidth >= 768;
          if (isDesktop && selectedChatId) {
            uiStore.navigate(`/chat/${p}/${selectedChatId}`);
          } else {
            uiStore.navigate(`/chat/${p}`);
          }
        }}
        onNotificationToggle={() => uiStore.toggleNotifications()}
        notificationCount={notificationStore.unreadCount}
        requestsCount={chatListStore.pendingRequestCount}
        onLogout={handleLogout}
        hideOnMobile={!!selectedChatId}
      />

      <aside
        class={[
          "glass-panel flex-col z-10 min-h-0 md:flex-none transition-all duration-300",
          uiStore.isSidebarCollapsed
            ? "w-0 opacity-0 border-none overflow-hidden hidden md:flex"
            : "w-full md:w-70 lg:w-87.5 md:min-w-70 lg:min-w-87.5 border-r",
          selectedChatId ? "hidden md:flex" : "flex flex-1 md:flex-initial",
        ]}
      >
        {#key activePanel}
          <div
            in:fly={{ x: -20, duration: 300, delay: 150, easing: quintOut }}
            out:fade={{ duration: 150 }}
            class="flex flex-col h-full overflow-hidden"
          >
            {#if activePanel === "conversations"}
              <Lazy
                component={Views.ConversationsPanel}
                activeChatId={selectedChatId}
                onSelectChat={(id: string) =>
                  uiStore.navigate(`${Route.CONVERSATIONS}/${id}`, {
                    resetSidebar: false,
                  })}
                unreadCount={notificationStore.unreadCount}
                onNotificationToggle={() => uiStore.toggleNotifications()}
              />
            {:else if activePanel === "profile"}
              <Lazy component={Views.ProfilePanel} />
            {:else if activePanel === "settings"}
              <Lazy component={Views.SettingsPanel} user={authStore.user} onLogout={handleLogout} />
            {:else if activePanel === "requests"}
              <Lazy component={Views.RequestsPanel} />
            {/if}
          </div>
        {/key}
      </aside>

      <section
        class={[
          "flex-1 min-h-0 min-w-0 flex flex-col relative bg-slate-100/50 dark:bg-slate-950/30",
          selectedChatId ? "flex" : "hidden md:flex flex-col justify-center items-center",
        ]}
      >
        {#if selectedChatId}
          {#if isInitialChatListLoad || !selectedChat}
            <div
              class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-100/50 dark:bg-slate-950/30"
            >
              <Spinner class="w-8 h-8 text-indigo-600 mb-4" />
              <p class="text-sm text-slate-500 animate-pulse">Loading conversation details...</p>
            </div>
          {:else}
            <Lazy
              component={Views.ChatWindow}
              chatId={selectedChatId}
              otherUser={selectedOtherUser}
              status={selectedChatStatus}
              onBack={() => uiStore.navigate("/chat/" + activePanel)}
            />
          {/if}
        {:else}
          <WelcomeDashboard />
        {/if}
      </section>

      <!-- Chat Partner Profile Panel -->
      <aside
        class={[
          "glass-panel flex-col z-50 transition-all duration-300 border-l shrink-0",
          "fixed inset-y-0 right-0 md:relative",
          uiStore.chatInfoOpen && selectedChatId
            ? "w-full md:w-75 lg:w-87.5 opacity-100 translate-y-0 md:translate-x-0"
            : "w-full md:w-0 opacity-0 border-none overflow-hidden translate-y-full md:translate-y-0 md:translate-x-0 hidden md:flex",
        ]}
      >
        <Lazy
          component={Views.ChatPartnerProfile}
          user={selectedOtherUser}
          onClose={() => (uiStore.chatInfoOpen = false)}
        />
      </aside>
    </div>
    <ToastContainer
      bind:this={toastContainer}
      onToastClick={(id: string) => uiStore.navigate(`${Route.CONVERSATIONS}/${id}`)}
    />
  </main>
{/snippet}

{#snippet GuestApp()}
  {@const config = GUEST_VIEW_CONFIG[routerStore.segments[0]] || {
    component: Views.Home,
    centered: false,
  }}
  <div class="flex flex-col w-screen h-dvh bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden">
    <!-- Guest Header -->
    <header
      class="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md z-50"
    >
      <div class="max-w-7xl mx-auto px-3 sm:px-4 h-full flex items-center justify-between">
        <button
          onclick={() => uiStore.navigate("/")}
          class="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0 active:scale-95"
        >
          <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <span class="text-white font-bold text-xl">T</span>
          </div>
          <span class="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-slate-100">Talkbox</span>
        </button>

        <div class="flex items-center gap-4">
          {#if routerStore.segments.length === 0}
            <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400 mr-4">
              <a href="#features" class="hover:text-indigo-600 transition-colors">Features</a>
              <button
                onclick={() => uiStore.navigate(Route.FAQ)}
                class="hover:text-indigo-600 transition-colors cursor-pointer">FAQ</button
              >
              <button
                onclick={() => uiStore.navigate(Route.PRICING)}
                class="hover:text-indigo-600 transition-colors cursor-pointer">Pricing</button
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
      class={cn(
        "flex-1 overflow-y-auto w-full flex flex-col",
        isDocPage || isHomePage ? "block" : "items-center p-4 sm:p-8",
      )}
    >
      {#if config.centered}
        <div class="w-full flex justify-center py-8 my-auto">
          <Lazy component={config.component}>
            {#snippet toggleSignup()}
              <button class="text-indigo-600 font-medium" onclick={() => toggleView("SIGNUP")}>Sign up</button>
            {/snippet}
            {#snippet toggleLogin()}
              <button class="text-indigo-600 font-medium" onclick={() => toggleView("LOGIN")}>Log in</button>
            {/snippet}
          </Lazy>
        </div>
      {:else}
        <Lazy component={config.component} />
      {/if}
    </div>
  </div>
{/snippet}

<Lazy component={Views.GlobalTooltip} />
<Lazy component={Views.ReactionTooltip} />
<Lazy component={Views.ConfirmationDialog} />

<!-- Global Alerts -->
<div
  class="fixed top-8 left-1/2 -translate-x-1/2 z-10001 flex flex-col gap-3 pointer-events-none w-full items-center px-4"
>
  {#each uiStore.alerts as alert (alert.id)}
    <Alert {alert} onClose={() => uiStore.removeAlert(alert.id)} />
  {/each}
  {#each errorStore.errors as error (error.id)}
    <Alert
      alert={{ id: error.id, message: error.message, type: error.type === "error" ? "danger" : error.type }}
      onClose={() => errorStore.dismiss(error.id)}
    />
  {/each}
</div>

<style>
  /* Base styles moved to app.css */
</style>
