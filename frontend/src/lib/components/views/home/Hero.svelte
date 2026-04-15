<script lang="ts">
  import { authStore } from "../../../state/auth.svelte";
  import { routerStore } from "../../../state/router.svelte";
  import { Route } from "../../../utils/routes";
  import AppPreview from "./AppPreview.svelte";

  // Navigation CTAs
  let dashboardLink = Route.CONVERSATIONS;
  let loginLink = Route.LOGIN;
  let signupLink = Route.SIGNUP;
</script>

<section class="max-w-7xl mx-auto px-4 text-center mt-12 md:mt-24">
  <h1
    class="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
  >
    Connect. Chat. <br /> Collaborate.
  </h1>
  <p class="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
    Experience real-time messaging with a premium interface.
  </p>

  <div class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
    {#if authStore.user}
      <button
        onclick={() => routerStore.navigate(dashboardLink)}
        class="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/30"
      >
        Go to Dashboard
      </button>
    {:else}
      <button
        onclick={() => routerStore.navigate(signupLink)}
        class="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-600/30"
      >
        Get Started for Free
      </button>
      <button
        onclick={() => routerStore.navigate(loginLink)}
        class="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
      >
        Sign In
      </button>
    {/if}
  </div>

  <AppPreview />
</section>
