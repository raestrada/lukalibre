import { writable, get } from 'svelte/store';
import authService, { type User } from '../services/authService';
import { push as navigate } from 'svelte-spa-router';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  const store = {
    subscribe,

    // Getter para obtener el estado actual
    getState: () => {
      return get({ subscribe });
    },

    // Inicializa el estado revisando si hay token guardado (solo JWT propio)
    init: async () => {
      update((state) => ({ ...state, loading: true }));
      try {
        if (authService.isLoggedIn()) {
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          return true;
        } else {
          set({ ...initialState, loading: false });
          return false;
        }
      } catch (err) {
        authService.logout();
        set({ ...initialState, loading: false });
        return false;
      }
    },

    // Login con email y password
    login: async (email: string, password: string) => {
      update((state) => ({ ...state, loading: true, error: null }));
      try {
        await authService.login(email, password);
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, loading: false, error: null });
        navigate('/dashboard');
        return true;
      } catch (err: any) {
        set({ ...initialState, loading: false, error: 'Error al iniciar sesión' });
        return false;
      }
    },

    // Logout
    logout: () => {
      console.log('AuthStore: Cerrando sesión');
      authService.logout();
      set({ ...initialState, loading: false });

      // Forzar la navegación al login limpiando cualquier estado previo
      setTimeout(() => {
        console.log('AuthStore: Redirigiendo a login después de logout');
        navigate('/login');
      }, 100);
    },

    // Actualizar usuario actual
    setUser: (user: User) => {
      console.log('AuthStore: Actualizando usuario:', user.email);
      update((state) => ({ ...state, user, isAuthenticated: true }));
    },

    // Limpiar error
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    // Login con Google
    loginWithGoogle: async (credential: string) => {
      update((state) => ({ ...state, loading: true, error: null }));
      try {
        await authService.loginWithGoogle(credential);
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, loading: false, error: null });
        navigate('/dashboard');
        return true;
      } catch (err: any) {
        set({ ...initialState, loading: false, error: 'Error en autenticación con Google' });
        return false;
      }
    },
  };

  return store;
}

export const authStore = createAuthStore();
