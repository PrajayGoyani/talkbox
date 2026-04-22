<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { authStore } from "$state/auth.svelte";
  import { confirmStore } from "$state/confirm.svelte";
  import { routerStore } from "$state/router.svelte";
  import { uiStore } from "$state/ui.svelte";
  import confetti from "canvas-confetti";
  import { quintOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";

  let loading = $state(false);

  const plans = [
    {
      name: "Free",
      id: "free",
      price: "$0",
      description: "Perfect for casual chatting and exploring Talkbox.",
      features: [
        "1 Active session limit",
        "5 Active chats limit",
        "7 Days message retention",
        "Standard support",
      ],
      buttonText: "Current Plan",
      highlight: false,
    },
    {
      name: "Pro",
      id: "pro",
      price: "$9.99",
      period: "/month",
      description: "For power users who need the ultimate chat experience.",
      features: [
        "10 Active sessions limit",
        "Infinite chats",
        "Unlimited history",
        "Priority support",
        "Exclusive 'Pro' badge",
      ],
      buttonText: "Upgrade to Pro",
      highlight: true,
    },
  ];

  async function triggerCelebration() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    const colors = ["#6366f1", "#a855f7", "#fbbf24"];

    // 1. Initial Burst
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors,
      scalar: 1.2,
      zIndex: 1000,
    });

    // 2. Side Cannons
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.8 },
        colors,
        zIndex: 1000,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.8 },
        colors,
        zIndex: 1000,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  async function handleUpgrade() {
    if (!authStore.user) {
      uiStore.addAlert(
        "Please create an account or log in to upgrade to Pro.",
        "info",
      );
      routerStore.navigate("/signup");
      return;
    }

    if (authStore.user?.plan === "pro") return;

    const confirmed = await confirmStore.show({
      title: "Simulated Checkout",
      message:
        "This is a dummy payment process. No real money will be charged. Are you ready to upgrade to Pro?",
      confirmText: "Yes, Upgrade Me",
      cancelText: "Maybe Later",
      variant: "info",
    });

    if (confirmed) {
      loading = true;
      try {
        await authStore.upgradeToPro();
        triggerCelebration();
        uiStore.addAlert(
          "Welcome to Pro! Your account has been upgraded.",
          "success",
        );
      } catch (err: any) {
        uiStore.addAlert(err.message || "Upgrade failed", "danger");
      } finally {
        loading = false;
      }
    }
  }

  function handleBack() {
    if (authStore.user) {
      routerStore.navigate("/chat");
    } else {
      routerStore.navigate("/");
    }
  }
</script>

<main
  class="min-h-full w-full bg-slate-50 dark:bg-slate-950 px-4 py-12 md:py-24 flex flex-col items-center"
>
  <div class="max-w-4xl w-full" in:fade={{ duration: 600 }}>
    <header class="text-center mb-16">
      <button
        onclick={handleBack}
        class="mb-8 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-indigo-600"
      >
        <Icon name="back" class="w-4 h-4" />
        Back
      </button>

      <h1
        class="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white"
      >
        Elevate Your <span
          class="bg-linear-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
          >Talkbox</span
        > Experience
      </h1>
      <p class="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
        Join Pro to unlock unrestricted communication and premium features
        tailored for professionals.
      </p>
    </header>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      {#each plans as plan, i}
        <section
          class="glass-panel relative flex flex-col p-8 transition-all duration-500 hover:translate-y-[-8px] {plan.highlight
            ? 'ring-2 ring-indigo-500 shadow-2xl shadow-indigo-500/10'
            : ''}"
          in:fly={{
            y: 50,
            delay: 200 + i * 100,
            duration: 800,
            easing: quintOut,
          }}
        >
          {#if plan.highlight}
            <div
              class="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg shadow-indigo-500/40"
            >
              Most Popular
            </div>
          {/if}

          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-2 text-slate-900 dark:text-white">
              {plan.name}
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {plan.description}
            </p>
          </div>

          <div class="mb-8 flex items-baseline gap-1">
            <span class="text-4xl font-black text-slate-900 dark:text-white"
              >{plan.price}</span
            >
            {#if plan.period}
              <span class="text-slate-500 dark:text-slate-500 font-medium"
                >{plan.period}</span
              >
            {/if}
          </div>

          <ul class="flex-1 space-y-4 mb-10">
            {#each plan.features as feature}
              <li
                class="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300"
              >
                <div
                  class="mt-0.5 w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0"
                >
                  <Icon name="check" class="w-2.5 h-2.5" stroke-width={4} />
                </div>
                {feature}
              </li>
            {/each}
          </ul>

          <button
            onclick={plan.id === "pro" ? handleUpgrade : undefined}
            disabled={loading ||
              (plan.id === "free" && authStore.user?.plan === "free") ||
              (plan.id === "pro" && authStore.user?.plan === "pro")}
            class="w-full py-4 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                   {plan.id === 'free'
              ? 'bg-slate-200 dark:bg-white/5 text-slate-500'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/30'}"
          >
            {#if loading && plan.id === "pro"}
              <span class="flex items-center justify-center gap-2">
                <Icon name="loader" class="w-4 h-4 animate-spin" />
                Processing...
              </span>
            {:else if authStore.user?.plan === plan.id}
              Current Plan
            {:else}
              {plan.id === "free" && authStore.user?.plan === "pro"
                ? "Included"
                : plan.buttonText}
            {/if}
          </button>
        </section>
      {/each}
    </div>

    <footer class="mt-20 text-center">
      <p
        class="text-sm text-slate-500 dark:text-slate-600 mb-4 font-medium italic"
      >
        * Simulated subscription for demonstration purposes. Payments are not
        truly processed.
      </p>
    </footer>
  </div>
</main>

<style>
  .glass-panel {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 24px;
    box-shadow:
      0 4px 6px -1px rgb(0 0 0 / 0.1),
      0 2px 4px -2px rgb(0 0 0 / 0.1);
  }

  :global([data-theme="dark"]) .glass-panel {
    background: rgba(30, 41, 59, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(16px);
  }
</style>
