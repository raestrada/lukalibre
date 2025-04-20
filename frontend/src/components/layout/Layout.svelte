<script lang="ts">
  import Header from './Header.svelte';
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  
  onMount(() => {
    authStore.init();
  });
</script>

<div class="app">
  <Header />
  
  <main class="main">
    <div class="container">
      <slot></slot>
    </div>
  </main>
  
  <footer class="footer">
    <div class="container">
      <p>&copy; {new Date().getFullYear()} LukaLibre — Proyecto sin fines de lucro.</p>
      <p>Educación Financiera para Chile</p>
    </div>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  
  .main {
    flex: 1;
    padding: var(--space-lg) 0;
  }
  
  .footer {
    background-color: var(--verde-luka);
    color: white;
    padding: var(--space-lg) 0;
    text-align: center;
    margin-top: auto;
  }
  
  .footer p {
    margin-bottom: var(--space-xs);
  }
</style> 