import Home from './components/Home.svelte';
import Login from './components/auth/Login.svelte';
import Register from './components/auth/Register.svelte';
import Dashboard from './components/dashboard/Dashboard.svelte';
import NotFound from './components/NotFound.svelte';
import GoogleAuthCallback from './components/auth/GoogleAuthCallback.svelte';
import Profile from './components/user/Profile.svelte';
import { authStore } from './stores/authStore';
import { push } from 'svelte-spa-router';
import { wrap } from 'svelte-spa-router/wrap';

// Guard de autenticación para rutas protegidas
const authGuard = () => {
  const { isAuthenticated } = authStore.getState();
  if (!isAuthenticated) {
    console.log('Intento de acceso a ruta protegida sin autenticación, redirigiendo...');
    push('/login');
    return false;
  }
  return true;
};

const routes = {
  '/': Home,
  '/login': Login,
  '/register': Register,
  '/auth/google/callback': GoogleAuthCallback,
  
  '/dashboard': wrap({
    component: Dashboard,
    conditions: [
      authGuard
    ]
  }),
  
  '/profile': wrap({
    component: Profile,
    conditions: [
      authGuard
    ]
  }),
  
  '*': NotFound
};

export default routes; 