<script lang="ts">
  import { authStore } from "$state/auth.svelte";
  import { routerStore } from "$state/router.svelte";
  import { Route } from "$utils/routes";

  let dashboardLink = Route.CONVERSATIONS;
  let loginLink = Route.LOGIN;
  let signupLink = Route.SIGNUP;
</script>

<footer
  class="bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-16"
>
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
      <div class="col-span-1 md:col-span-2">
        <div class="flex items-center gap-2 mb-6">
          <div
            class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"
          >
            <span class="text-white font-bold text-xl">T</span>
          </div>
          <span class="font-bold text-xl tracking-tight">Talkbox</span>
        </div>
        <p class="text-slate-600 dark:text-slate-400 max-w-sm">
          Fast, secure, and beautiful - just like your best conversations.
        </p>
      </div>

      <div>
        <h4
          class="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500"
        >
          Legal
        </h4>
        <ul class="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          <li>
            <button
              onclick={() => routerStore.navigate(Route.TERMS)}
              class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >Terms of Use</button
            >
          </li>
          <li>
            <button
              onclick={() => routerStore.navigate(Route.PRIVACY)}
              class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >Privacy Policy</button
            >
          </li>
          <li>
            <button
              onclick={() => routerStore.navigate(Route.FAQ)}
              class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >FAQ</button
            >
          </li>
          <li>
            <button
              onclick={() => routerStore.navigate(Route.PRIVACY)}
              class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >Cookie Policy</button
            >
          </li>
        </ul>
      </div>

      <div>
        <h4
          class="font-bold mb-6 uppercase text-xs tracking-widest text-slate-500"
        >
          Links
        </h4>
        <ul class="space-y-4 text-sm text-slate-600 dark:text-slate-400">
          {#if authStore.user}
            <li>
              <button
                onclick={() => routerStore.navigate(dashboardLink)}
                class="hover:text-indigo-600 dark:hover:text-indigo-400"
                >Dashboard</button
              >
            </li>
          {:else}
            <li>
              <button
                onclick={() => routerStore.navigate(loginLink)}
                class="hover:text-indigo-600 dark:hover:text-indigo-400"
                >Sign In</button
              >
            </li>
            <li>
              <button
                onclick={() => routerStore.navigate(signupLink)}
                class="hover:text-indigo-600 dark:hover:text-indigo-400"
                >Sign Up</button
              >
            </li>
          {/if}
        </ul>
      </div>
    </div>

    <div
      class="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500"
    >
      <p>© 2026 Talkbox &nbsp; • &nbsp; Crafted with love for real people.</p>
      <div
        class="bg-indigo-600/5 dark:bg-indigo-600/10 px-4 py-2 rounded-full border border-indigo-600/10 flex items-center gap-2"
      >
        <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
        <p>We use cookies only for security and authentication.</p>
      </div>
    </div>
  </div>
</footer>
