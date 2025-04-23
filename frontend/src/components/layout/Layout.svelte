<script lang="ts">
  import Header from './Header.svelte';
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  
  // Iniciamos como inicializando y App.svelte se encargará de actualizar
  let isInitializing = true;
  
  onMount(async () => {
    try {
      console.log("Layout: Montado");
      
      // Verificar si App.svelte ya inició el proceso de autenticación
      const state = authStore.getState();
      
      // Si el estado ya no está en carga, significa que App.svelte ya lo inicializó
      if (!state.loading) {
        console.log("Layout: AuthStore ya inicializado por App.svelte");
        isInitializing = false;
        return;
      }
      
      // De lo contrario, esperamos 300ms para dar tiempo a App.svelte a inicializar
      setTimeout(() => {
        console.log("Layout: Actualizando estado de inicialización");
        isInitializing = false;
      }, 300);
    } catch (error) {
      console.error("Layout: Error al verificar estado de autenticación:", error);
      isInitializing = false;
    }
  });
</script>

<div class="app">
  <Header {isInitializing} />
  
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