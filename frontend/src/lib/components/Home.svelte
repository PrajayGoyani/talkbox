<script lang="ts">
  import { authStore } from "../state/auth.svelte";
  import { themeStore } from "../state/theme.svelte";
  import { routerStore } from "../state/router.svelte";
  import { Route } from "../utils/routes";

  // Navigation CTAs
  let dashboardLink = Route.CONVERSATIONS;
  let loginLink = Route.LOGIN;
  let signupLink = Route.SIGNUP;
</script>

<div
  class="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden"
>
  <main>
    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-4 text-center mt-12 md:mt-24">
      <h1
        class="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"
      >
        Connect. Chat. <br /> Collaborate.
      </h1>
      <p
        class="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10"
      >
        Experience seamless, real-time messaging with a premium interface.
        <!-- designed for modern teams and individuals. -->
      </p>

      <div
        class="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
      >
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

      <!-- App Preview -->
      <div
        class="relative max-w-5xl mx-auto group perspective-1000 px-2 sm:px-0"
      >
        <div
          class="absolute -top-10 -left-10 md:-top-20 md:-left-20 w-32 h-32 md:w-64 md:h-64 bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-700"
        ></div>
        <div
          class="absolute -bottom-10 -right-10 md:-bottom-20 md:-right-20 w-32 h-32 md:w-64 md:h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse"
        ></div>

        <div
          class="relative rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(79,70,229,0.2)] border border-slate-200 dark:border-slate-800 transform rotate-x-6 rotate-y--6 transition-all duration-700 group-hover:rotate-0 group-hover:scale-[1.02] bg-white dark:bg-slate-950 max-w-full"
        >
          <!-- Top Bar -->
          <div
            class="h-10 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-1.5"
          >
            <div
              class="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/40"
            ></div>
            <div
              class="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40"
            ></div>
            <div
              class="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40"
            ></div>
          </div>

          <!-- Stylized Mockup content -->
          <div class="aspect-4/3 sm:aspect-video flex min-w-0">
            <!-- Mock Icon Rail -->
            <div
              class="w-10 sm:w-14 border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col items-center py-4 gap-4 shrink-0"
            >
              <div
                class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-600"
              >
                <div
                  class="w-3 h-3 sm:w-4 sm:h-4 bg-indigo-600 rounded-sm"
                ></div>
              </div>
              <div
                class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50"
              ></div>
              <div
                class="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-slate-200 dark:bg-slate-800 opacity-50"
              ></div>
            </div>

            <!-- Mock Chat List (Hidden on mobile) -->
            <div
              class="hidden sm:flex w-1/4 border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 flex-col space-y-6 shrink-0"
            >
              <div
                class="w-full h-8 bg-slate-100 dark:bg-slate-900 rounded-lg"
              ></div>
              {#each [1, 2, 3, 4] as i}
                <div class="flex gap-3 items-center opacity-70">
                  <div
                    class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0"
                  ></div>
                  <div class="space-y-2 flex-1">
                    <div
                      class="w-3/4 h-3 bg-slate-100 dark:bg-slate-800 rounded"
                    ></div>
                    <div
                      class="w-1/2 h-2 bg-slate-50 dark:bg-slate-900 rounded"
                    ></div>
                  </div>
                </div>
              {/each}
            </div>

            <!-- Mock Chat Window -->
            <div
              class="flex-1 p-4 md:p-8 flex flex-col justify-end gap-3 md:gap-6 bg-slate-50/30 dark:bg-slate-900/20 min-w-0"
            >
              <div class="flex gap-2 md:gap-3">
                <div
                  class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-slate-200 dark:bg-slate-800 self-end"
                ></div>
                <div
                  class="max-w-[85%] md:max-w-[70%] h-auto bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl md:rounded-2xl rounded-bl-sm p-3 md:p-4 shadow-sm"
                >
                  <div
                    class="w-24 md:w-full h-1.5 md:h-2 bg-slate-100 dark:bg-slate-800 rounded"
                  ></div>
                  <div
                    class="w-16 md:w-2/3 h-1.5 md:h-2 bg-slate-100 dark:bg-slate-800 rounded mt-2"
                  ></div>
                </div>
              </div>
              <div class="flex gap-2 md:gap-3 flex-row-reverse">
                <div
                  class="w-6 h-6 md:w-8 md:h-8 rounded-full bg-indigo-600 self-end"
                ></div>
                <div
                  class="max-w-[85%] md:max-w-[70%] h-auto bg-indigo-600 rounded-xl md:rounded-2xl rounded-br-sm p-3 md:p-4 text-white shadow-lg shadow-indigo-600/20"
                >
                  <div
                    class="w-20 md:w-full h-1.5 md:h-2 bg-white/30 rounded"
                  ></div>
                </div>
              </div>
              <div
                class="h-10 md:h-12 w-full mt-2 md:mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 justify-between"
              >
                <div
                  class="w-1/3 h-1.5 md:h-2 bg-slate-100 dark:bg-slate-800 rounded"
                ></div>
                <div
                  class="w-5 h-5 md:w-6 md:h-6 bg-indigo-600 rounded-lg"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section
      id="features"
      class="py-32 bg-slate-100/50 dark:bg-slate-950/50 mt-32"
    >
      <div class="max-w-7xl mx-auto px-4">
        <div class="text-center mb-20">
          <h2 class="text-3xl md:text-5xl font-bold mb-4">
            Everything you need
          </h2>
          <p class="text-slate-600 dark:text-slate-400">
            Powerhouse features packed into a minimalist interface.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <!-- Feature 1 -->
          <div
            class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div
              class="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Real-time Sync</h3>
            <p class="text-slate-600 dark:text-slate-400">
              Messages delivered across all devices in under 100ms. Stay in the
              loop, always.
            </p>
          </div>

          <!-- Feature 2 -->
          <div
            class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div
              class="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Bank-grade Security</h3>
            <p class="text-slate-600 dark:text-slate-400">
              Your data is encrypted and secure. We prioritize your privacy
              above all else.
            </p>
          </div>

          <!-- Feature 3 -->
          <div
            class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2"
          >
            <div
              class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h3a1 1 0 011 1v6a1 1 0 01-1 1h-3a1 1 0 01-1-1v-6z"
                />
              </svg>
            </div>
            <h3 class="text-xl font-bold mb-2">Unified Dashboard</h3>
            <p class="text-slate-600 dark:text-slate-400">
              Manage all your conversations, settings, and profile from one
              gorgeous interface.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="py-32 max-w-4xl mx-auto px-4">
      <h2 class="text-3xl md:text-5xl font-bold text-center mb-16">
        Common Questions
      </h2>
      <div class="space-y-4">
        <details
          class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all"
        >
          <summary
            class="list-none cursor-pointer flex items-center justify-between font-bold text-lg"
          >
            Is Talkbox free to use?
            <span
              class="group-open:rotate-180 transition-transform duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </span>
          </summary>
          <div
            class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          >
            Yes, Talkbox offers a robust free tier for individual users. Premium
            features for teams are coming soon.
          </div>
        </details>

        <details
          class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all"
        >
          <summary
            class="list-none cursor-pointer flex items-center justify-between font-bold text-lg"
          >
            Can I use it on multiple devices?
            <span
              class="group-open:rotate-180 transition-transform duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </span>
          </summary>
          <div
            class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          >
            Absolutely. Your messages sync instantly across desktop and mobile
            browsers.
          </div>
        </details>

        <details
          class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all"
        >
          <summary
            class="list-none cursor-pointer flex items-center justify-between font-bold text-lg"
          >
            How secure is my data?
            <span
              class="group-open:rotate-180 transition-transform duration-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                ><path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                /></svg
              >
            </span>
          </summary>
          <div
            class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
          >
            We use industry-standard encryption protocols and never sell your
            personal information.
          </div>
        </details>
      </div>
    </section>
  </main>

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
            Building the future of digital communication. Fast, secure, and
            beautiful - just like your best conversations.
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
        <p>
          © 2026 Talkbox &nbsp; • &nbsp; Crafted with love for real people.
        </p>
        <div
          class="bg-indigo-600/5 dark:bg-indigo-600/10 px-4 py-2 rounded-full border border-indigo-600/10 flex items-center gap-2"
        >
          <div class="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
          <p>We use cookies only for security and authentication.</p>
        </div>
      </div>
    </div>
  </footer>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  .perspective-1000 {
    perspective: 1000px;
  }

  .rotate-x-6 {
    --tw-rotate-x: 6deg;
    transform: translate3d(
        var(--tw-translate-x),
        var(--tw-translate-y),
        var(--tw-translate-z)
      )
      rotate(var(--tw-rotate)) rotateX(var(--tw-rotate-x))
      rotateY(var(--tw-rotate-y)) rotateZ(var(--tw-rotate-z))
      skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x))
      scaleY(var(--tw-scale-y));
  }

  .rotate-y--6 {
    --tw-rotate-y: -6deg;
    transform: translate3d(
        var(--tw-translate-x),
        var(--tw-translate-y),
        var(--tw-translate-z)
      )
      rotate(var(--tw-rotate)) rotateX(var(--tw-rotate-x))
      rotateY(var(--tw-rotate-y)) rotateZ(var(--tw-rotate-z))
      skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x))
      scaleY(var(--tw-scale-y));
  }
</style>
