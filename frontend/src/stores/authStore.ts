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
  error: null
};

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);
  
  const store = {
    subscribe,
    
    // Getter para obtener el estado actual
    getState: () => {
      return get({ subscribe });
    },
    
    // Inicializa el estado revisando si hay token guardado
    init: async () => {
      update(state => ({ ...state, loading: true }));
      
      try {
        if (authService.isLoggedIn()) {
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          console.log("AuthStore inicializado con usuario:", user.email);
        } else {
          set({ ...initialState, loading: false });
          console.log("AuthStore inicializado sin usuario autenticado");
        }
      } catch (err) {
        console.error('Error initializing auth store:', err);
        
        try {
          // Intentar refresh token si falla la inicialización
          await authService.refreshToken();
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          console.log("AuthStore inicializado con token refrescado");
        } catch (refreshErr) {
          console.error('Error refreshing token:', refreshErr);
          authService.logout();
          set({ ...initialState, loading: false });
          console.log("Fallo al refrescar token, estado limpiado");
        }
      }
    },
    
    // Login con email y password
    login: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        await authService.login({ email, password });
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, loading: false, error: null });
        navigate('/dashboard');
        return true;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Error al iniciar sesión';
        set({ ...initialState, loading: false, error: errorMessage });
        return false;
      }
    },
    
    // Logout
    logout: () => {
      authService.logout();
      set({ ...initialState, loading: false });
      navigate('/login');
    },
    
    // Actualizar usuario actual
    setUser: (user: User) => {
      update(state => ({ ...state, user, isAuthenticated: true }));
    },
    
    // Limpiar error
    clearError: () => {
      update(state => ({ ...state, error: null }));
    }
  };
  
  return store;
}

export const authStore = createAuthStore(); 