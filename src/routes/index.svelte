<script lang="ts">
  import Resizable from '$lib/Resizable.svelte';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<Resizable bounds="parent" defaultSize={{ height: '400px', width: '60vw' }}>
  <div style="height: 100%; width: 100%; background-color: #6002ee; border-radius: 0.5rem;" />
</Resizable>

<style global>
  #svelte {
    height: 100vh;
  }
</style>
