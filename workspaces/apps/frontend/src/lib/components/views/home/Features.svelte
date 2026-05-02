<script lang="ts">
  import Icon from "$components/ui/Icon.svelte";

  // Features section for the landing page
</script>

<section id="features" class="py-32 bg-slate-100/50 dark:bg-slate-950/50 mt-32">
  <div class="max-w-7xl mx-auto px-4">
    <div class="text-center mb-20">
      <h2 class="text-3xl md:text-5xl font-bold mb-4">Everything you need</h2>
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
          <Icon name="bolt" class="w-6 h-6" />
        </div>
        <h3 class="text-xl font-bold mb-2">Multi-Device Sync</h3>
        <p class="text-slate-600 dark:text-slate-400">
          Stay connected everywhere. Pro users can maintain up to 10 active
          sessions across all their devices simultaneously.
        </p>
      </div>

      <!-- Feature 2 -->
      <div
        class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2"
      >
        <div
          class="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6"
        >
          <Icon name="lock" class="w-6 h-6" />
        </div>
        <h3 class="text-xl font-bold mb-2">Secure & Private</h3>
        <p class="text-slate-600 dark:text-slate-400">
          We encrypt your data and keep conversations private, just as they
          should be. Your data is yours.
        </p>
      </div>

      <!-- Feature 3 -->
      <div
        class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2"
      >
        <div
          class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6"
        >
          <Icon name="clock" class="w-6 h-6" />
        </div>
        <h3 class="text-xl font-bold mb-2">Unrestricted History</h3>
        <p class="text-slate-600 dark:text-slate-400">
          Never lose a word. Upgrade to Pro to unlock unlimited message history
          and access your entire archive.
        </p>
      </div>
    </div>
  </div>
</section>
