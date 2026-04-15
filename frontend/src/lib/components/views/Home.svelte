<script lang="ts">
  import Hero from "./home/Hero.svelte";
  import Features from "./home/Features.svelte";
  import FAQ from "./home/FAQ.svelte";
  import Footer from "../layout/Footer.svelte";
</script>

<div
  class="min-h-dvh-64px bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden"
>
  <main>
    <Hero />
    <Features />
    <FAQ />
  </main>

  <Footer />
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
</style>
