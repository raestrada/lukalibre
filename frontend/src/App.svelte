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
  import Dashboard from './components/dashboard/Dashboard.svelte';
  
  let isInitializing = true;
  
  // Función para detectar y procesar token desde la URL
  async function handleTokenFromUrl(): Promise<boolean> {
    // Verificar URL de callback sin hash
    if (window.location.pathname === '/auth/callback') {
      const urlParams = new URLSearchParams(window.location.search);
      
      if (urlParams.has('token')) {
        const token = urlParams.get('token')!;
        authService.setToken(token, 'jwt');
        await authStore.init();
        
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/');
          push('/dashboard');
        }, 100);
        
        return true;
      }
    }
    
    // Verificar callback de Google con hash
    if (window.location.pathname === '/auth/google/callback' && window.location.hash.includes('access_token=')) {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        authService.setToken(accessToken, 'google');
        localStorage.setItem('googleDriveToken', accessToken);
        await authStore.init();
        
        setTimeout(() => {
          window.history.replaceState({}, document.title, '/dashboard');
          push('/dashboard');
        }, 100);
        
        return true;
      }
    }
    
    return false;
  }
  
  onMount(async () => {
    try {
      // Intentar procesar token desde URL primero
      const tokenProcessed = await handleTokenFromUrl();
      if (tokenProcessed) {
        isInitializing = false;
        return;
      }
      
      // Ruta de callback con hash (dejar que componente maneje)
      if (window.location.hash.includes('/auth/callback')) {
        isInitializing = false;
        return;
      }
      
      // Inicializar normalmente
      await authStore.init();
    } catch (error) {
      console.error("Error al inicializar:", error);
      
      // Recuperación de emergencia con datos Google
      const email = localStorage.getItem('google_email');
      if (email && localStorage.getItem('token_type') === 'google') {
        authStore.forceAuthenticated({
          id: 0,
          email: email,
          full_name: localStorage.getItem('google_name') || 'Usuario de Google',
          is_active: true,
          is_superuser: false,
          google_avatar: localStorage.getItem('google_picture') || undefined
        });
      }
    } finally {
      isInitializing = false;
    }
  });
  
  // Verificación simplificada
  function isAuthenticated() {
    if (isInitializing) return false;
    
    const state = get(authStore);
    const authFromStore = state.isAuthenticated && !state.loading;
    const authFromToken = authService.isLoggedIn();
    
    return authFromStore || authFromToken;
  }
  
  // Redirige a login si no está autenticado
  function redirectIfNotAuthenticated() {
    if (!isAuthenticated()) {
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
    '/user/settings': wrap({
      component: Profile,
      conditions: [redirectIfNotAuthenticated]
    }),
    '/dashboard': wrap({
      component: Dashboard,
      conditions: [redirectIfNotAuthenticated]
    }),
    // Ruta por defecto (404)
    '*': Home
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
