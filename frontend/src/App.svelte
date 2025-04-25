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
  import Goals from './routes/goals.svelte';
  
  let isInitializing = true;
  
  // Simplificada: solo maneja JWT propio
  function extractJwtFromHash() {
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const jwt = params.get('access_token');
      if (jwt) {
        authService.setToken(jwt, 'jwt');
        window.history.replaceState({}, document.title, '/dashboard');
        push('/dashboard');
        return true;
      }
    }
    return false;
  }

  onMount(async () => {
    try {
      // Si hay JWT en el hash, procesar y redirigir
      if (extractJwtFromHash()) {
        await authStore.init();
        isInitializing = false;
        return;
      }
      // Inicialización normal
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
  import DataViewer from './components/data/DataViewer.svelte';

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
    '/data': wrap({
      component: DataViewer,
      conditions: [redirectIfNotAuthenticated]
    }),
    '/goals': wrap({
      component: Goals,
      conditions: [redirectIfNotAuthenticated]
    }),
    // Ruta por defecto (404)
    '*': Home
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
