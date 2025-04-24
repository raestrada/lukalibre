import httpService from './httpService';
import { createLogger } from '../utils/logger';
import type { AxiosError } from 'axios';

// Logger específico para este servicio
const log = createLogger('AuthService');

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
    if (this.isLoggedIn()) {
      try {
        log.debug("Token encontrado, verificando validez");
        // Verificar validez del token
        await this.getCurrentUser();
        log.info("Token válido, sesión activa");
        return true;
      } catch (error) {
        const err = error as AxiosError;
        // Detectar si es un error de red
        const isNetworkError = err.message === 'Network Error' || 
                               err.code === 'ERR_NETWORK' ||
                              (err.response && err.response.status === 0);
        
        if (isNetworkError) {
          log.warn("Error de red al verificar token. Asumiendo token válido para permitir navegación offline");
          return true;
        }
        
        log.warn("Token inválido, intentando refresh");
        try {
          await this.refreshToken();
          log.info("Token refrescado exitosamente");
          return true;
        } catch (refreshError) {
          const rErr = refreshError as AxiosError;
          const isRefreshNetworkError = rErr.message === 'Network Error' || 
                                      rErr.code === 'ERR_NETWORK' ||
                                      (rErr.response && rErr.response.status === 0);
          
          if (isRefreshNetworkError) {
            log.warn("Error de red al refrescar token. Asumiendo token válido en modo offline");
            return true;
          }
          
          log.error("Fallo al refrescar token");
          this.logout();
          return false;
        }
      }
    }
    log.debug("No hay token almacenado");
    return false;
  }

  // Método para autenticación estándar
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const data = new FormData();
      data.append('username', email);
      data.append('password', password);

      const response = await httpService.post<AuthResponse>('/login/access-token', data);
      
      this.setToken(response.data.access_token, 'jwt');
      log.info("Login exitoso para usuario:", email);
      return response.data;
    } catch (err) {
      log.error("Error en login:", err);
      throw err;
    }
  }
  
  // Método para autenticación con Google
  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    try {
      log.debug("Intentando login con Google");
      const response = await httpService.post<AuthResponse>(
        '/login/google',
        { token: credential }
      );
      
      // Guardamos info de Google para uso offline
      this.saveGoogleUserData(credential);
      
      this.setToken(response.data.access_token, 'google');
      log.info("Login con Google exitoso");
      return response.data;
    } catch (err) {
      const error = err as AxiosError;
      log.error("Error en login con Google:", error.message);
      
      // Para errores de red, permitir navegación offline
      if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
        log.warn("Error de red al login con Google. Configurando modo offline");
        
        this.setToken(credential, 'google');
        this.saveGoogleUserData(credential);
        
        // Crear respuesta simplificada para uso offline
        return {
          access_token: credential,
          token_type: "bearer",
          user_id: "offline-user",
          email: localStorage.getItem('google_email') || "offline@user.com"
        };
      }
      
      throw error;
    }
  }
  
  // Decodificar y guardar información del token de Google
  private saveGoogleUserData(token: string): void {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      
      if (payload.email) localStorage.setItem('google_email', payload.email);
      if (payload.name) localStorage.setItem('google_name', payload.name);
      if (payload.picture) localStorage.setItem('google_picture', payload.picture);
    } catch (error) {
      log.warn("No se pudo decodificar el token de Google:", error);
    }
  }
  
  // Obtener URL de autorización de Google
  getGoogleAuthUrl(): string {
    // Usar la URL completa del backend en lugar de una ruta relativa
    return `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PATH}/auth/google/authorize`;
  }
  
  // Refrescar token JWT
  async refreshToken(): Promise<AuthResponse> {
    log.debug("Intentando refrescar token");
    const response = await httpService.post<AuthResponse>(
      '/auth/refresh',
      {},
      { withCredentials: true }
    );
    
    log.info("Token refrescado exitosamente");
    this.setToken(response.data.access_token, 'jwt');
    return response.data;
  }
  
  // Obtener datos del usuario actual
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    const tokenType = this.getTokenType();
    
    if (!token) {
      log.error("No se encontró token al obtener usuario actual");
      throw new Error('No authentication token found');
    }
    
    // Para tokens de Google, primero intentar recuperar datos locales
    if (tokenType === 'google') {
      log.debug("Token de Google detectado, obteniendo información local");
      const email = localStorage.getItem('google_email');
      const name = localStorage.getItem('google_name');
      const avatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
      
      if (email && name) {
        log.info("Usando información de Google almacenada localmente");
        return {
          id: 0, // ID temporal
          email: email,
          full_name: name,
          is_active: true,
          is_superuser: false,
          google_avatar: avatar || undefined
        };
      }
    }
    
    log.debug("Obteniendo usuario con token desde el backend");
    try {
      const response = await httpService.post<User>(
        '/login/test-token',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      const userData = response.data;
      
      // Asignar avatar de Google si existe en localStorage
      const googleAvatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
      if (googleAvatar && !userData.google_avatar) {
        userData.google_avatar = googleAvatar;
      }
      
      log.info("Usuario obtenido:", userData.email);
      return userData;
    } catch (error) {
      log.error("Error obteniendo usuario actual:", error);
      
      // Manejo de modo offline
      if (error && (
        (error as AxiosError).message === 'Network Error' || 
        (error as AxiosError).code === 'ERR_NETWORK'
      )) {
        // Verificar datos de Google locales
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
      }
      
      throw error;
    }
  }
  
  // Cerrar sesión
  logout(): void {
    log.info("Cerrando sesión");
    localStorage.removeItem('token');
    localStorage.removeItem('token_type');
    
    // También limpiar datos de Google
    localStorage.removeItem('googleDriveToken');
  }
  
  // Guardar token de autenticación
  setToken(token: string, type: 'jwt' | 'google'): void {
    localStorage.setItem('token', token);
    localStorage.setItem('token_type', type);
    
    if (type === 'google') {
      localStorage.setItem('google_token', token);
    }
  }
  
  // Obtener token actual
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  
  // Obtener tipo de token
  getTokenType(): 'jwt' | 'google' | null {
    return localStorage.getItem('token_type') as 'jwt' | 'google' | null;
  }
  
  // Verificar si hay sesión iniciada
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService(); 