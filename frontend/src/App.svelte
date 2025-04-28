<script lang="ts">
  import Router from 'svelte-spa-router';
  import { wrap } from 'svelte-spa-router/wrap';
  import { push } from 'svelte-spa-router';
  import Layout from './components/layout/Layout.svelte';
  import { authStore } from './stores/authStore';
  import authService from './services/authService';
  import { get } from 'svelte/store';
  import { onMount } from 'svelte';
  import { isMobileDevice } from './services/deviceDetection';
  import type { ComponentType } from 'svelte';

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
  function extractJwtFromHash(): boolean {
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

        // Si es móvil y está autenticado, redirigir a captura móvil
        const authState = authStore.getState();
        if (isMobileDevice() && authState.isAuthenticated) {
          push('/mobile/capture');
        }
        return;
      }
      // Inicialización normal
      await authStore.init();

      // Si es móvil y está autenticado, redirigir a captura móvil
      const authState = authStore.getState();
      if (isMobileDevice() && authState.isAuthenticated) {
        push('/mobile/capture');
      }
    } catch (error) {
      console.error('Error al inicializar:', error);

      // Recuperación de emergencia con datos Google
      const email = localStorage.getItem('google_email');
      if (email && localStorage.getItem('token_type') === 'google') {
        authStore.setUser({
          id: 0,
          email: email,
          full_name: localStorage.getItem('google_name') || 'Usuario de Google',
          is_active: true,
          is_superuser: false,
          google_avatar: localStorage.getItem('google_picture') || undefined,
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
  import MobileCaptureView from './components/mobile/MobileCaptureView.svelte';

  // Función para redirigir a la captura móvil si corresponde
  function redirectMobileToCapture() {
    // Solo redirigir si es un móvil y el usuario está autenticado
    if (isMobileDevice() && isAuthenticated()) {
      // Solo redirigir si el usuario no está ya en /mobile/capture
      if (window.location.hash !== '#/mobile/capture') {
        push('/mobile/capture');
        return false;
      }
    }
    return true;
  }

  // Asegurar que todos los componentes sean tratados como ComponentType
  const HomeComponent = Home as unknown as ComponentType;
  const LoginComponent = Login as unknown as ComponentType;
  const RegisterComponent = Register as unknown as ComponentType;
  const GoogleCallbackComponent = GoogleCallback as unknown as ComponentType;
  const ProfileComponent = Profile as unknown as ComponentType;
  const DashboardComponent = Dashboard as unknown as ComponentType;
  const DataViewerComponent = DataViewer as unknown as ComponentType;
  const GoalsComponent = Goals as unknown as ComponentType;
  const MobileCaptureComponent = MobileCaptureView as unknown as ComponentType;

  const routes = {
    '/': HomeComponent,
    '/login': LoginComponent,
    '/register': RegisterComponent,
    '/auth/callback': GoogleCallbackComponent,
    '/profile': wrap({
      component: ProfileComponent,
      conditions: [redirectIfNotAuthenticated],
    }),
    '/user/settings': wrap({
      component: ProfileComponent,
      conditions: [redirectIfNotAuthenticated],
    }),
    '/dashboard': wrap({
      component: DashboardComponent,
      conditions: [redirectIfNotAuthenticated, redirectMobileToCapture],
    }),
    '/data': wrap({
      component: DataViewerComponent,
      conditions: [redirectIfNotAuthenticated, redirectMobileToCapture],
    }),
    '/goals': wrap({
      component: GoalsComponent,
      conditions: [redirectIfNotAuthenticated, redirectMobileToCapture],
    }),
    '/mobile/capture': wrap({
      component: MobileCaptureComponent,
      conditions: [redirectIfNotAuthenticated],
    }),
    // Ruta por defecto (404)
    '*': HomeComponent,
  };
</script>

<Layout>
  <Router {routes} />
</Layout>
