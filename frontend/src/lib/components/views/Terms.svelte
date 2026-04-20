<script lang="ts">
  import { routerStore } from "$state/router.svelte";
  import { Route } from "$utils/routes";
</script>

<div class="max-w-4xl mx-auto px-4 py-12 prose dark:prose-invert">
  <button
    onclick={() => routerStore.navigate("/")}
    class="mb-8 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2"
  >
    ← Back to Home
  </button>

  <h1 class="text-4xl font-extrabold mb-8">Terms of Use</h1>

  <p class="text-slate-500 mb-8 italic text-sm">Last updated: April 2026</p>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
    <p>
      By accessing and using Talkbox, you agree to be bound by these Terms of
      Use and all applicable laws and regulations.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">2. User Accounts</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account
      and password and for restricting access to your computer.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">3. Use License</h2>
    <p>
      Permission is granted to temporarily use Talkbox for personal,
      non-commercial transitory viewing only.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">4. Privacy Policy</h2>
    <p>
      Your use of Talkbox is also governed by our <button
        onclick={() => routerStore.navigate(Route.PRIVACY)}
        class="text-indigo-600 underline">Privacy Policy</button
      >.
    </p>
  </section>
</div>
