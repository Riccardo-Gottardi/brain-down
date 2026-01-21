<script lang="ts">
  import '../app.css';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  
  // Import children slot from Svelte 5 snippets
  let { children } = $props();
</script>

<div class="app">
  {@render children()}
</div>

<ToastContainer />

<style>
  .app {
    width: 100%;
    height: 100vh;
    overflow: hidden;
    /* Background is set in app.css on body, 
       or overridden by individual pages */
  }
</style>