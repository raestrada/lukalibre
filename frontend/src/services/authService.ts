import axios from 'axios';
import { createLogger } from '../utils/logger';

// Logger específico para este servicio
const log = createLogger('AuthService');

// Obtenemos la URL de la API desde las variables de entorno
const API_URL = `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PATH}`;
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  created_at?: string;
  google_avatar?: string;
}

class AuthService {
  // Verificar estado de sesión completo (incluyendo Google)
  async checkSession(): Promise<boolean> {
    log.debug("Verificando sesión");
    // Primero verificamos si hay un token almacenado localmente
    if (this.isLoggedIn()) {
      try {
        log.debug("Token encontrado, verificando validez");
        // Intentar obtener el usuario actual para verificar que el token es válido
        await this.getCurrentUser();
        log.info("Token válido, sesión activa");
        return true;
      } catch (error: any) {
        // Detectar si es un error de red o CORS
        const isNetworkError = error.message === 'Network Error' || 
                              error.code === 'ERR_NETWORK' ||
                              (error.response && error.response.status === 0);
        
        if (isNetworkError) {
          log.warn("Error de red al verificar token. Asumiendo token válido para permitir navegación offline");
          // Si es un error de red, asumimos que el token es válido para permitir navegación
          return true;
        }
        
        log.warn("Token inválido, intentando refresh");
        // Si falla por otras razones, intentar refrescar el token
        try {
          await this.refreshToken();
          log.info("Token refrescado exitosamente");
          return true;
        } catch (refreshError: any) {
          // También verificar si es un error de red en el refresh
          const isRefreshNetworkError = refreshError.message === 'Network Error' || 
                                       refreshError.code === 'ERR_NETWORK' ||
                                       (refreshError.response && refreshError.response.status === 0);
          
          if (isRefreshNetworkError) {
            log.warn("Error de red al refrescar token. Asumiendo token válido para permitir navegación offline");
            return true;
          }
          
          log.error("Fallo al refrescar token");
          // Si también falla el refresh por otras razones, limpiar el token
          this.logout();
          return false;
        }
      }
    }
    log.debug("No hay token almacenado");
    return false;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const data = new FormData();
      data.append('username', email);
      data.append('password', password);

      const response = await axios.post<AuthResponse>(`${API_URL}/login/access-token`, data);
      
      this.setToken(response.data.access_token, 'jwt');
      log.info("Login exitoso para usuario:", email);
      return response.data;
    } catch (err: any) {
      log.error("Error en login:", err.message);
      throw err;
    }
  }
  
  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    try {
      log.debug("Intentando login con Google");
      const response = await axios.post<AuthResponse>(
        `${API_URL}/login/google`,
        { token: credential }
      );
      
      // Guardar información de Google para uso offline
      try {
        const base64Url = credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        
        // Store Google user data for offline use
        if (payload.email) localStorage.setItem('google_email', payload.email);
        if (payload.name) localStorage.setItem('google_name', payload.name);
        if (payload.picture) localStorage.setItem('google_picture', payload.picture);
      } catch (decodeError) {
        log.warn("No se pudo decodificar el token de Google:", decodeError);
      }
      
      this.setToken(response.data.access_token, 'google');
      log.info("Login con Google exitoso");
      return response.data;
    } catch (err: any) {
      log.error("Error en login con Google:", err.message);
      
      // Para errores de red, permitir navegación offline si tenemos el token de Google
      if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        log.warn("Error de red al login con Google. Configurando modo offline");
        
        // Store the Google token to use it later
        this.setToken(credential, 'google');
        
        // Create a simplified response for offline use
        return {
          access_token: credential,
          token_type: "bearer",
          user_id: "offline-user",
          email: localStorage.getItem('google_email') || "offline@user.com"
        };
      }
      
      throw err;
    }
  }
  
  getGoogleAuthUrl(): string {
    return `${API_URL}/auth/google/authorize`;
  }
  
  async refreshToken(): Promise<AuthResponse> {
    log.debug("Intentando refrescar token");
    const response = await axios.post<AuthResponse>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    log.info("Token refrescado exitosamente");
    this.setToken(response.data.access_token, 'jwt');
    return response.data;
  }
  
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    const tokenType = this.getTokenType();
    
    if (!token) {
      log.error("No se encontró token al obtener usuario actual");
      throw new Error('No authentication token found');
    }
    
    // If it's a Google token, try to get user info locally first
    if (tokenType === 'google') {
      log.debug("Token de Google detectado, obteniendo información local");
      const email = localStorage.getItem('google_email');
      const name = localStorage.getItem('google_name');
      const avatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
      
      if (email && name) {
        log.info("Usando información de Google almacenada localmente");
        // Create a user from locally stored Google information
        const user: User = {
          id: 0, // Temporary ID
          email: email,
          full_name: name,
          is_active: true,
          is_superuser: false,
          google_avatar: avatar || undefined
        };
        
        return user;
      }
    }
    
    log.debug("Obteniendo usuario con token desde el backend");
    try {
      const response = await axios.post<User>(
        `${API_URL}/login/test-token`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const userData = response.data;
      
      // Verificar si hay un avatar de Google en localStorage
      const googleAvatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
      if (googleAvatar && !userData.google_avatar) {
        log.debug("Usando avatar de localStorage:", googleAvatar);
        userData.google_avatar = googleAvatar;
      } else if (userData.google_avatar) {
        log.debug("Usuario ya tiene avatar en los datos:", userData.google_avatar);
      } else {
        log.debug("No se encontró avatar ni en usuario ni en localStorage");
      }
      
      log.info("Usuario obtenido:", userData.email);
      return userData;
    } catch (error: any) {
      log.error("Error obteniendo usuario actual:", error.message);
      
      // Si es un error de red y tenemos datos locales o un token JWT, devolver un usuario básico
      if ((error.message === 'Network Error' || error.code === 'ERR_NETWORK')) {
        // First check if we have Google data locally
        const email = localStorage.getItem('google_email');
        const name = localStorage.getItem('google_name');
        const avatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
        
        if (email || name) {
          log.warn("Error de red, usando datos de Google almacenados localmente");
          return {
            id: 0,
            email: email || "usuario@google.com",
            full_name: name || "Usuario de Google",
            is_active: true,
            is_superuser: false,
            google_avatar: avatar || undefined
          };
        }
        
        // If no Google data but we have JWT token
        if (token && tokenType === 'jwt') {
          log.warn("Error de red, usando datos de token JWT para usuario básico");
          
          // Intentar decodificar el JWT para obtener información básica
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            
            // Crear usuario básico con la información del token
            return {
              id: 0,  // ID temporal
              email: payload.email || "usuario@example.com",
              full_name: payload.name || null,
              is_active: true,
              is_superuser: false
            };
          } catch (parseError) {
            log.error("No se pudo decodificar el token JWT:", parseError);
          }
        }
      }
      
      // Re-lanzar el error si no se pudo manejar
      throw error;
    }
  }
  
  logout(): void {
    log.debug("Eliminando token y sesión");
    localStorage.removeItem('token');
    localStorage.removeItem('google_avatar');
    // También se puede añadir código para eliminar la cookie de refresh token
    // haciendo una petición al backend que elimine la cookie
    try {
      // Intentar eliminar cookies de refresh token si existen
      axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
        .catch(err => log.warn("No se pudo eliminar cookie de refresh token:", err));
    } catch (error) {
      log.error("Error al intentar logout en servidor:", error);
    }
  }
  
  setToken(token: string, type: 'jwt' | 'google'): void {
    log.debug("Guardando nuevo token");
    
    // Store the token type to distinguish between Google and JWT tokens
    localStorage.setItem('token_type', type);
    
    localStorage.setItem('token', token);
  }
  
  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token;
  }
  
  getTokenType(): 'jwt' | 'google' | null {
    return (localStorage.getItem('token_type') as 'jwt' | 'google' | null) || null;
  }
  
  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    log.debug("¿Tiene token?", hasToken);
    return hasToken;
  }
}

export default new AuthService(); 