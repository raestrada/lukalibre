<script lang="ts">
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import Layout from './components/layout/Layout.svelte';
  
  // Componentes para las rutas
  import Home from './components/Home.svelte';
  import Login from './components/auth/Login.svelte';
  import Register from './components/auth/Register.svelte';
  import GoogleCallback from './components/auth/GoogleCallback.svelte';
  import Profile from './components/user/Profile.svelte';
  
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
          // Aquí podemos verificar si el usuario está autenticado
          // Por ahora, permitimos acceso a todos
          return true;
        }
      ]
    }),
    '/dashboard': wrap({
      component: Profile, // Usar el componente Profile como dashboard
      conditions: [
        () => {
          // Verificar autenticación cuando tengamos la lógica lista
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
