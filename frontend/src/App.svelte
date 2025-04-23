<script lang="ts">
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { push } from 'svelte-spa-router';
  import Layout from './components/layout/Layout.svelte';
  import { authStore } from './stores/authStore';
  import authService from './services/authService';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  
  // Componentes para las rutas
  import Home from './components/Home.svelte';
  import Login from './components/auth/Login.svelte';
  import Register from './components/auth/Register.svelte';
  import GoogleCallback from './components/auth/GoogleCallback.svelte';
  import Profile from './components/user/Profile.svelte';
  
  let isInitializing = true;
  
  // Función para detectar si hay un token en la URL y procesarlo
  async function detectAndProcessToken() {
    try {
      // Verificar si estamos en una URL de callback sin hash
      if (window.location.pathname === '/auth/callback') {
        console.log("App: Detectada URL de callback sin hash, procesando token...");
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('token')) {
          console.log("App: Token encontrado en URL, almacenando...");
          const token = urlParams.get('token')!;
          authService.setToken(token);
          
          // Inicializar store
          await authStore.init();
          
          // Redirigir al dashboard y limpiar URL
          setTimeout(() => {
            window.history.replaceState({}, document.title, '/');
            push('/dashboard');
          }, 100);
          
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("App: Error procesando token de URL:", error);
      return false;
    }
  }
  
  onMount(async () => {
    console.log("App: Inicializando aplicación");
    try {
      // Primero, intentar detectar y procesar token en la URL
      const tokenProcessed = await detectAndProcessToken();
      if (tokenProcessed) {
        console.log("App: Token procesado de URL, omitiendo inicialización normal");
        isInitializing = false;
        return;
      }
      
      // Verificar si estamos en una ruta de callback con hash
      if (window.location.hash.includes('/auth/callback')) {
        console.log("App: Detectada ruta de callback con hash, dejando que el componente maneje la autenticación");
        isInitializing = false;
        return;
      }
      
      // Inicializar authStore normalmente
      await authStore.init();
    } catch (error) {
      console.error("App: Error al inicializar authStore:", error);
    } finally {
      isInitializing = false;
      console.log("App: Inicialización completada");
    }
  });
  
  // Función para verificar si el usuario está autenticado
  function isAuthenticated() {
    if (isInitializing) {
      console.log('App: Aún inicializando, no se puede verificar autenticación');
      return false;
    }
    
    const state = get(authStore);
    const autenticado = state.isAuthenticated && !state.loading;
    console.log('App: Verificación de autenticación en ruta:', autenticado);
    return autenticado;
  }
  
  // Redirige a login si no está autenticado
  function redirectIfNotAuthenticated() {
    if (!isAuthenticated()) {
      console.log('App: Usuario no autenticado, redirigiendo a login');
      push('/login');
      return false;
    }
    return true;
  }
  
  // Definición de rutas
  const routes = {
    '/': Home,
    '/login': Login,
    '/register': Register,
    '/auth/callback': GoogleCallback,
    '/profile': wrap({
      component: Profile,
      conditions: [redirectIfNotAuthenticated]
    }),
    '/dashboard': wrap({
      component: Profile, // Usar el componente Profile como dashboard
      conditions: [redirectIfNotAuthenticated]
    }),
    // Ruta por defecto (404)
    '*': Home
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
