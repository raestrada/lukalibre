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
      
      // Verificar si estamos en la URL específica de callback de Google con hash
      if (window.location.pathname === '/auth/google/callback' && window.location.hash.includes('access_token=')) {
        console.log("App: Detectado callback de Google con access_token en hash");
        
        // Extraer el token del hash
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1)); // Quitar el # inicial
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          console.log("App: Token extraído del hash, almacenando...");
          
          try {
            // Guardar el token para autenticación
            authService.setToken(accessToken);
            
            // También almacenar para Google Drive si es necesario
            localStorage.setItem('googleDriveToken', accessToken);
            
            // Inicializar store - IMPORTANTE: Usar await para asegurar que se complete
            console.log("App: Inicializando authStore con token de Google...");
            const success = await authStore.init();
            
            if (success) {
              console.log("App: AuthStore inicializado correctamente");
            } else {
              console.warn("App: AuthStore no se pudo inicializar pero continuamos con token válido");
            }
            
            // Limpiar la URL para eliminar el token y redirigir
            setTimeout(() => {
              window.history.replaceState({}, document.title, '/dashboard');
              push('/dashboard');
            }, 100);
            
            return true;
          } catch (error) {
            console.error("App: Error procesando token Google:", error);
            // Continuar con el token aunque haya error
            return true;
          }
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
    
    // Primera comprobación: verificar el estado del store
    const state = get(authStore);
    const autenticadoStore = state.isAuthenticated && !state.loading;
    
    // Segunda comprobación: verificar también si hay un token válido directamente
    const hayToken = authService.isLoggedIn();
    
    console.log('App: Verificación de autenticación en ruta:', 
      { storeAuth: autenticadoStore, tokenAuth: hayToken });
    
    // Si cualquiera de las dos comprobaciones es positiva, consideramos al usuario autenticado
    return autenticadoStore || hayToken;
  }
  
  // Redirige a login si no está autenticado
  function redirectIfNotAuthenticated() {
    const auth = isAuthenticated();
    if (!auth) {
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
    '/user/settings': wrap({
      component: Profile, // Usamos Profile como componente de configuración
      conditions: [redirectIfNotAuthenticated]
    }),
    '/dashboard': wrap({
      component: Dashboard, // Ahora usamos el componente Dashboard
      conditions: [redirectIfNotAuthenticated]
    }),
    // Ruta por defecto (404)
    '*': Home
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
