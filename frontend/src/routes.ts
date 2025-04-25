import Home from './components/Home.svelte';
import Login from './components/auth/Login.svelte';
import Register from './components/auth/Register.svelte';
import Dashboard from './components/dashboard/Dashboard.svelte';
import NotFound from './components/NotFound.svelte';
import GoogleAuthCallback from './components/auth/GoogleAuthCallback.svelte';
import Profile from './components/user/Profile.svelte';
import { authStore } from './stores/authStore';
import authService from './services/authService';
import { push } from 'svelte-spa-router';
import { wrap } from 'svelte-spa-router/wrap';

// Guard de autenticación para rutas protegidas
const authGuard = async () => {
  // Verificar tanto el store como el token directamente
  const { isAuthenticated } = authStore.getState();
  const hayToken = authService.isLoggedIn();
  
  // Si cualquiera de las dos comprobaciones es positiva, consideramos al usuario autenticado
  let autenticado = isAuthenticated || hayToken;
  
  // Si aún no se considera autenticado pero hay un token, intentar verificar la sesión
  if (!autenticado && hayToken) {
    console.log('Route Guard: Token encontrado pero no autenticado en store, verificando sesión...');
    try {
      // Verificar sesión de forma síncrona
      const sesionActiva = await authService.checkSession();
      if (sesionActiva) {
        console.log('Route Guard: Sesión verificada correctamente');
        autenticado = true;
        
        // Inicializar el store si es necesario
        if (!isAuthenticated) {
          await authStore.init();
        }
      } else {
        console.log('Route Guard: No se pudo verificar la sesión');
      }
    } catch (err) {
      console.error('Route Guard: Error verificando sesión:', err);
      // Si hay error pero tenemos token, asumimos que está autenticado
      // para evitar ciclos de redirección en caso de problemas con el API
      autenticado = !!hayToken;
    }
  }
  
  if (!autenticado) {
    console.log('Intento de acceso a ruta protegida sin autenticación, redirigiendo...');
    console.log('Estado de auth:', { storeAuth: isAuthenticated, tokenAuth: hayToken });
    push('/login');
    return false;
  }
  
  console.log('Route Guard: Usuario autenticado, permitiendo acceso');
  return true;
};

import DataViewer from './components/data/DataViewer.svelte';

import Goals from './routes/goals.svelte';

const routes = {
  '/': Home,
  '/login': Login,
  '/register': Register,
  '/auth/google/callback': GoogleAuthCallback,
  
  // Special route for handling direct Google callbacks from frontend
  '/auth/callback': GoogleAuthCallback,
  
  // Special route for handling direct Google Drive auth
  '/auth/google/drive/callback': GoogleAuthCallback,
  
  '/dashboard': wrap({
    component: Dashboard,
    conditions: [
      authGuard
    ],
    // Indicar a svelte-spa-router que el guard es asíncrono
    async: true
  }),
  
  '/data': wrap({
    component: DataViewer,
    conditions: [authGuard],
    async: true
  }),

  '/profile': wrap({
    component: Profile,
    conditions: [
      authGuard
    ],
    async: true
  }),

  '/goals': wrap({
    component: Goals,
    conditions: [authGuard],
    async: true
  }),
  
  '*': NotFound
};

export default routes; 