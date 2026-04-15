<script lang="ts">
  import Icon from "../../ui/Icon.svelte";
  // FAQ section with accordion details
</script>

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
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg"
      >
        Is Talkbox free to use?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        Yes, Talkbox is free to use in this public preview.
      </div>
    </details>

    <details
      class="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden transition-all"
    >
      <summary
        class="list-none cursor-pointer flex items-center justify-between font-bold text-lg"
      >
        Can I use it on multiple devices?
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
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
        <span class="group-open:rotate-180 transition-transform duration-300">
          <Icon name="chevron-down" class="w-5 h-5" />
        </span>
      </summary>
      <div
        class="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400"
      >
        We use encryption protocols and never sell your personal information.
      </div>
    </details>
  </div>
</section>
