<script lang="ts">
  import { routerStore } from "../state/router.svelte";
  import { Route } from "../utils/routes";
</script>

<div class="max-w-4xl mx-auto px-4 py-12 prose dark:prose-invert">
  <button 
    onclick={() => routerStore.navigate("/")}
    class="mb-8 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2"
  >
    ← Back to Home
  </button>
  
  <h1 class="text-4xl font-extrabold mb-8 underline decoration-indigo-600">Privacy Policy</h1>
  
  <p class="text-slate-500 mb-8 italic text-sm">Last updated: April 2026</p>
  
  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">1. Information We Collect</h2>
    <p>We collect information you provide directly to us when you create an account, such as your username, email, and password (which is hashed).</p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">2. Use of Cookies</h2>
    <p>We use functional cookies to track authentication sessions and for security purposes. No third-party tracking cookies are used.</p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">3. Data Security</h2>
    <p>We implement a variety of security measures to maintain the safety of your personal information. Your messages are stored in our secure database.</p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">4. Compliance</h2>
    <p>By using Talkbox, you consent to our practices as described in this Policy and our <button onclick={() => routerStore.navigate(Route.TERMS)} class="text-indigo-600 underline">Terms of Use</button>.</p>
  </section>
</div>
