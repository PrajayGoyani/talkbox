<script lang="ts">
  import Footer from "$components/layout/Footer.svelte";
  import Features from "$components/views/home/Features.svelte";
  import Hero from "$components/views/home/Hero.svelte";
</script>

<div
  class="min-h-dvh-64px bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden"
>
  <main>
    <Hero />
    <Features />
  </main>

  <Footer />
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
