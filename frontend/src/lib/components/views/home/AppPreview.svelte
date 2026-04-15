<script lang="ts">
  // AppPreview component - a stylized mockup of the application
</script>

<div class="relative max-w-5xl mx-auto group perspective-1000 px-2 sm:px-0">
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
          <div class="w-3 h-3 sm:w-4 sm:h-4 bg-indigo-600 rounded-sm"></div>
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
        <div class="w-full h-8 bg-slate-100 dark:bg-slate-900 rounded-lg"></div>
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
            <div class="w-20 md:w-full h-1.5 md:h-2 bg-white/30 rounded"></div>
          </div>
        </div>
        <div
          class="h-10 md:h-12 w-full mt-2 md:mt-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl flex items-center px-3 md:px-4 justify-between"
        >
          <div
            class="w-1/3 h-1.5 md:h-2 bg-slate-100 dark:bg-slate-800 rounded"
          ></div>
          <div class="w-5 h-5 md:w-6 md:h-6 bg-indigo-600 rounded-lg"></div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
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
