<script lang="ts">
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { push } from 'svelte-spa-router';
  import Layout from './components/layout/Layout.svelte';
  import { authStore } from './stores/authStore';
  import { get } from 'svelte/store';
  
  // Componentes para las rutas
  import Home from './components/Home.svelte';
  import Login from './components/auth/Login.svelte';
  import Register from './components/auth/Register.svelte';
  import GoogleCallback from './components/auth/GoogleCallback.svelte';
  import Profile from './components/user/Profile.svelte';
  
  // Función para verificar si el usuario está autenticado
  function isAuthenticated() {
    const state = get(authStore);
    const autenticado = state.isAuthenticated && !state.loading;
    console.log('Verificación de autenticación en ruta:', autenticado);
    return autenticado;
  }
  
  // Definición de rutas
  const routes = {
    '/': Home,
    '/login': Login,
    '/register': Register,
    '/auth/callback': GoogleCallback,
    '/profile': wrap({
      component: Profile,
      conditions: [
        () => {
          if (!isAuthenticated()) {
            console.log('Usuario no autenticado, redirigiendo a login');
            push('/login');
            return false;
          }
          return true;
        }
      ]
    }),
    '/dashboard': wrap({
      component: Profile, // Usar el componente Profile como dashboard
      conditions: [
        () => {
          if (!isAuthenticated()) {
            console.log('Usuario no autenticado, redirigiendo a login');
            push('/login');
            return false;
          }
          return true;
        }
      ]
    }),
    // Ruta por defecto (404)
    '*': Home
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
