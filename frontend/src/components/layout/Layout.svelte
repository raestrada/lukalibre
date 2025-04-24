<script lang="ts">
  import Header from './Header.svelte';
  import Sidebar from './Sidebar.svelte';
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  // Iniciamos como inicializando y App.svelte se encargará de actualizar
  let isInitializing = true;
  function handleLogout() {
    authService.logout();
  }
  function handleSettings() {
    window.location.href = '/user/settings';
  }
  onMount(async () => {
    try {
      console.log("Layout: Montado");
      
      // Verificar si App.svelte ya inició el proceso de autenticación
      const state = authStore.getState();
      
      // Si el estado ya está autenticado, no hacemos nada más
      if (state.isAuthenticated) {
        console.log("Layout: Usuario ya autenticado");
        isInitializing = false;
        return;
      }
      
      // Si el estado ya no está en carga pero no está autenticado, verificamos Google token
      if (!state.loading && !state.isAuthenticated) {
        console.log("Layout: AuthStore inicializado pero no autenticado, verificando Google token");
        
        // Verificar si hay datos de Google guardados
        const tokenType = localStorage.getItem('token_type');
        const googleToken = localStorage.getItem('google_token');
        const email = localStorage.getItem('google_email');
        
        // Si hay token de Google y datos, forzamos la autenticación
        if (tokenType === 'google' && googleToken && email) {
          console.log("Layout: Recuperando sesión de Google");
          
          // Forzar autenticación con datos locales
          authStore.forceAuthenticated({
            id: 0,
            email: email,
            full_name: localStorage.getItem('google_name') || 'Usuario de Google',
            is_active: true,
            is_superuser: false,
            google_avatar: (localStorage.getItem('google_picture') || localStorage.getItem('google_avatar') || undefined)
          });
          
          console.log("Layout: Sesión de Google forzada con éxito");
        }
        
        isInitializing = false;
        return;
      }
      
      // De lo contrario, esperamos 300ms para dar tiempo a App.svelte a inicializar
      setTimeout(() => {
        console.log("Layout: Actualizando estado de inicialización");
        
        // Verificar una última vez por si cambió durante la espera
        const currentState = authStore.getState();
        if (!currentState.isAuthenticated && !currentState.loading) {
          // Verificar token de Google
          const tokenType = localStorage.getItem('token_type');
          const googleEmail = localStorage.getItem('google_email');
          
          if (tokenType === 'google' && googleEmail) {
            console.log("Layout: Último intento de recuperar sesión Google");
            authStore.forceAuthenticated({
              id: 0,
              email: googleEmail,
              full_name: localStorage.getItem('google_name') || 'Usuario de Google',
              is_active: true,
              is_superuser: false,
              google_avatar: (localStorage.getItem('google_picture') || localStorage.getItem('google_avatar') || undefined)
            });
          }
        }
        
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
  <div class="layout-main">
    {#if !['/', '/login', '/register'].includes(window.location.pathname)}
      <Sidebar onLogout={handleLogout} onSettings={handleSettings} />
    {/if}
    <main class="main">
      <div class="container">
        <slot></slot>
      </div>
    </main>
  </div>
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
  .layout-main {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
  }
  .main {
    flex: 1 1 auto;
    padding: var(--space-lg) 0;
    min-width: 0;
    min-height: 0;
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