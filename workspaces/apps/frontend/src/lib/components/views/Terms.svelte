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
      By accessing and using Talkbox, you agree to be bound by these Terms of Use and all applicable laws and
      regulations.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">2. Eligibility & Age Requirement</h2>
    <p>
      You must be at least <strong>13 years old</strong> to use our Services or such greater age required in your country
      or territory. Talkbox does not knowingly collect or solicit information from anyone under the required age. If you are
      under the minimum age requirement, you are not permitted to register for an account or use the service.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">3. User Accounts</h2>
    <p>
      You are responsible for maintaining the confidentiality of your account and password and for restricting access to
      your computer.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">4. Message Modification & Deletion</h2>
    <p>
      Users may edit or delete their own messages within a <strong>one-hour window</strong> following the initial transmission.
      After this period, messages become permanent records within the conversation. This limit is subject to change at the
      discretion of Talkbox.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">5. Use License</h2>
    <p>Permission is granted to temporarily use Talkbox for personal, non-commercial transitory viewing only.</p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">6. Subscription Plans</h2>
    <p>
      Talkbox offers a Free tier and a Pro subscription. By subscribing to the Pro plan, you gain access to increased
      usage limits, including up to 5 concurrent sessions and <strong>unlimited message history</strong>. Free tier
      users are limited to 1 concurrent session, 5 active chat threads, and
      <strong>7 days of message history</strong>.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">7. Refund Policy</h2>
    <p>
      All subscriptions are processed as a public preview simulation. However, for the purposes of these terms, all
      subscription purchases are final and non-refundable.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">8. Privacy Policy</h2>
    <p>
      Your use of Talkbox is also governed by our <button
        onclick={() => routerStore.navigate(Route.PRIVACY)}
        class="text-indigo-600 underline">Privacy Policy</button
      >.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">9. Data Deletion</h2>
    <p>
      Please be advised that user-initiated deletion is permanent and irreversible. While content is masked immediately
      upon deletion, technical records may persist in our systems for up to 14 days during the background purging
      process. Deleted content cannot be recovered or restored by the Talkbox team under any circumstances.
    </p>
  </section>
</div>
