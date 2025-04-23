import axios from 'axios';

// Obtenemos la URL de la API desde las variables de entorno
const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
// Obtenemos la URL base para el proxy en desarrollo o directo en producción
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
    console.log("AuthService: Verificando sesión");
    // Primero verificamos si hay un token almacenado localmente
    if (this.isLoggedIn()) {
      try {
        console.log("AuthService: Token encontrado, verificando validez");
        // Intentar obtener el usuario actual para verificar que el token es válido
        await this.getCurrentUser();
        console.log("AuthService: Token válido, sesión activa");
        return true;
      } catch (error) {
        console.log("AuthService: Token inválido, intentando refresh");
        // Si falla, intentar refrescar el token
        try {
          await this.refreshToken();
          console.log("AuthService: Token refrescado exitosamente");
          return true;
        } catch (refreshError) {
          console.error("AuthService: Fallo al refrescar token");
          // Si también falla el refresh, limpiar el token y retornar false
          this.logout();
          return false;
        }
      }
    }
    console.log("AuthService: No hay token almacenado");
    return false;
  }

  async login(credentials: UserCredentials): Promise<AuthResponse> {
    console.log("AuthService: Iniciando login con credenciales");
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await axios.post<AuthResponse>(
      `${API_URL}/login/access-token`,
      formData,
      { withCredentials: true } // Para recibir cookies (refresh token)
    );
    
    console.log("AuthService: Login exitoso, guardando token");
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  getGoogleAuthUrl(): string {
    return `${API_URL}/auth/google/authorize`;
  }
  
  async refreshToken(): Promise<AuthResponse> {
    console.log("AuthService: Intentando refrescar token");
    const response = await axios.post<AuthResponse>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    console.log("AuthService: Token refrescado exitosamente");
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    
    if (!token) {
      console.error("AuthService: No se encontró token al obtener usuario actual");
      throw new Error('No authentication token found');
    }
    
    console.log("AuthService: Obteniendo usuario con token");
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
      console.log("AuthService: Usando avatar de localStorage:", googleAvatar);
      userData.google_avatar = googleAvatar;
    } else if (userData.google_avatar) {
      console.log("AuthService: Usuario ya tiene avatar en los datos:", userData.google_avatar);
      
      // Ya no modificamos la URL, la usamos tal como viene
    } else {
      console.log("AuthService: No se encontró avatar ni en usuario ni en localStorage");
    }
    
    console.log("AuthService: Usuario obtenido:", userData.email);
    return userData;
  }
  
  logout(): void {
    console.log("AuthService: Eliminando token y sesión");
    localStorage.removeItem('token');
    localStorage.removeItem('google_avatar');
    // También se puede añadir código para eliminar la cookie de refresh token
    // haciendo una petición al backend que elimine la cookie
    try {
      // Intentar eliminar cookies de refresh token si existen
      axios.post(`${API_URL}/auth/logout`, {}, { withCredentials: true })
        .catch(err => console.log("No se pudo eliminar cookie de refresh token:", err));
    } catch (error) {
      console.error("Error al intentar logout en servidor:", error);
    }
  }
  
  setToken(token: string): void {
    console.log("AuthService: Guardando nuevo token");
    localStorage.setItem('token', token);
  }
  
  getToken(): string | null {
    const token = localStorage.getItem('token');
    return token;
  }
  
  isLoggedIn(): boolean {
    const hasToken = !!this.getToken();
    console.log("AuthService: ¿Tiene token?", hasToken);
    return hasToken;
  }
}

export default new AuthService(); 