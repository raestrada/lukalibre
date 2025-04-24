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
      } catch (error) {
        log.warn("Token inválido, intentando refresh");
        // Si falla, intentar refrescar el token
        try {
          await this.refreshToken();
          log.info("Token refrescado exitosamente");
          return true;
        } catch (refreshError) {
          log.error("Fallo al refrescar token");
          // Si también falla el refresh, limpiar el token y retornar false
          this.logout();
          return false;
        }
      }
    }
    log.debug("No hay token almacenado");
    return false;
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    log.debug("Iniciando login con credenciales");
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await axios.post<AuthResponse>(
      `${API_URL}/login/access-token`,
      formData,
      { withCredentials: true } // Para recibir cookies (refresh token)
    );
    
    log.info("Login exitoso, guardando token");
    this.setToken(response.data.access_token);
    return response.data;
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
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    
    if (!token) {
      log.error("No se encontró token al obtener usuario actual");
      throw new Error('No authentication token found');
    }
    
    log.debug("Obteniendo usuario con token");
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
    const googleAvatar = localStorage.getItem('google_avatar');
    if (googleAvatar && !userData.google_avatar) {
      log.debug("Usando avatar de localStorage:", googleAvatar);
      userData.google_avatar = googleAvatar;
    } else if (userData.google_avatar) {
      log.debug("Usuario ya tiene avatar en los datos:", userData.google_avatar);
      
      // Ya no modificamos la URL, la usamos tal como viene
    } else {
      log.debug("No se encontró avatar ni en usuario ni en localStorage");
    }
    
    log.info("Usuario obtenido:", userData.email);
    return userData;
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
  
  setToken(token: string): void {
    log.debug("Guardando nuevo token");
    localStorage.setItem('token', token);
  }
  
  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token;
  }
  
  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    log.debug("¿Tiene token?", hasToken);
    return hasToken;
  }
}

export default new AuthService(); 