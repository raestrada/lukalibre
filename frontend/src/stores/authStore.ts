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
          console.log("AuthStore: Hay token, obteniendo usuario actual");
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          console.log("AuthStore: Usuario autenticado:", user.email);
          return true;
        } else {
          console.log("AuthStore: No hay token válido");
          set({ ...initialState, loading: false });
          return false;
        }
      } catch (err) {
        console.error('AuthStore: Error initializing auth store:', err);
        
        try {
          // Intentar refresh token si falla la inicialización
          console.log("AuthStore: Intentando refrescar token");
          await authService.refreshToken();
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          console.log("AuthStore: Token refrescado, usuario:", user.email);
          return true;
        } catch (refreshErr) {
          console.error('AuthStore: Error refreshing token:', refreshErr);
          authService.logout();
          set({ ...initialState, loading: false });
          console.log("AuthStore: Fallo al refrescar token, estado limpiado");
          return false;
        }
      }
    },
    
    // Login con email y password
    login: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        console.log("AuthStore: Iniciando login con email/password");
        await authService.login(email, password);
        const user = await authService.getCurrentUser();
        set({ user, isAuthenticated: true, loading: false, error: null });
        console.log("AuthStore: Login exitoso, navegando al dashboard");
        navigate('/dashboard');
        return true;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Error al iniciar sesión';
        console.error("AuthStore: Error en login:", errorMessage);
        set({ ...initialState, loading: false, error: errorMessage });
        return false;
      }
    },
    
    // Logout
    logout: () => {
      console.log("AuthStore: Cerrando sesión");
      authService.logout();
      set({ ...initialState, loading: false });
      
      // Forzar la navegación al login limpiando cualquier estado previo
      setTimeout(() => {
        console.log("AuthStore: Redirigiendo a login después de logout");
        navigate('/login');
      }, 100);
    },
    
    // Actualizar usuario actual
    setUser: (user: User) => {
      console.log("AuthStore: Actualizando usuario:", user.email);
      update(state => ({ ...state, user, isAuthenticated: true }));
    },
    
    // Forzar estado autenticado para modo offline
    forceAuthenticated: (user: User) => {
      console.log("AuthStore: Forzando autenticación offline con usuario:", user.email);
      set({ user, isAuthenticated: true, loading: false, error: null });
    },
    
    // Limpiar error
    clearError: () => {
      update(state => ({ ...state, error: null }));
    },
    
    // Login con Google
    loginWithGoogle: async (credential: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        console.log("AuthStore: Iniciando login con Google");
        
        // Intentar login con el backend
        try {
          await authService.loginWithGoogle(credential);
          const user = await authService.getCurrentUser();
          set({ user, isAuthenticated: true, loading: false, error: null });
          console.log("AuthStore: Login con Google exitoso (backend)");
        } catch (backendErr) {
          console.warn("AuthStore: Error en backend para Google login:", backendErr);
          
          // Si falla el backend, usar modo offline con datos del token
          // Obtener datos básicos del localStorage (los datos ya deberían estar guardados)
          const email = localStorage.getItem('google_email');
          const name = localStorage.getItem('google_name');
          const picture = localStorage.getItem('google_picture');
          
          if (email && name) {
            console.log("AuthStore: Usando datos offline de Google");
            const user = {
              id: 0,
              email,
              full_name: name,
              is_active: true,
              is_superuser: false,
              google_avatar: picture || undefined
            };
            
            set({ user, isAuthenticated: true, loading: false, error: null });
            console.log("AuthStore: Login con Google exitoso (offline mode)");
          } else {
            throw new Error("No se pudieron obtener datos del usuario de Google");
          }
        }
        
        return true;
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || 'Error en autenticación con Google';
        console.error("AuthStore: Error fatal en login con Google:", errorMessage);
        set({ ...initialState, loading: false, error: errorMessage });
        return false;
      }
    },
  };
  
  return store;
}

export const authStore = createAuthStore(); 