<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";
  import { routerStore } from "$state/router.svelte";
</script>

<div class="w-full max-w-4xl mx-auto px-4 py-12">
  <button
    onclick={() => routerStore.navigate("/")}
    class="mb-8 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2 active:scale-95 transition-transform"
  >
    <Icon name="arrow-left" class="w-4 h-4" />
    Back to Home
  </button>

  <h1 class="text-4xl md:text-5xl font-extrabold mb-12 text-slate-900 dark:text-slate-100">
    Frequently Asked Questions
  </h1>

  <div class="space-y-4">
    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        What is Talkbox?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        Talkbox is a fast, secure messaging app that keeps conversations in sync
        across your devices.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        Is Talkbox free to use?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        Talkbox offers a generous Free tier that includes all core messaging
        features. To unlock unlimited message history, higher session limits,
        and priority support, you can upgrade to <strong>Talkbox Pro</strong>.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        What happens to my messages after 7 days?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        On the Free plan, message content older than 7 days is automatically
        masked to save space and maintain platform performance. You can unlock
        your entire chat history at any time by upgrading to a Pro subscription.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        Can I stay logged in on multiple devices?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        Free accounts are limited to one active session at a time. If you log in
        on a new device, your previous session will be closed. Pro users can
        maintain up to 10 active sessions simultaneously.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        Can I recover a message after I delete it?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        No. For your privacy, when you delete a message or a chat, it is
        permanently removed from our servers and cannot be recovered by you or
        the Talkbox team.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        Can I use Talkbox on mobile?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        Absolutely. Talkbox is a progressive web app that works beautifully on
        mobile browsers. Your messages sync instantly across all devices.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all shadow-sm hover:shadow-md"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg text-slate-800 dark:text-slate-200"
      >
        How secure is my data?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        We prioritize your security. All communications are encrypted over
        HTTPS, and we use industry-standard practices to protect your data. We
        never sell your personal information.
      </div>
    </details>
  </div>
</div>
