import axios from 'axios';

const API_URL = '/api/v1';

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
}

class AuthService {
  async login(credentials: UserCredentials): Promise<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.email);
    formData.append('password', credentials.password);
    
    const response = await axios.post<AuthResponse>(
      `${API_URL}/login/access-token`,
      formData,
      { withCredentials: true } // Para recibir cookies (refresh token)
    );
    
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  getGoogleAuthUrl(): string {
    return `${API_URL}/auth/google/authorize`;
  }
  
  async refreshToken(): Promise<AuthResponse> {
    const response = await axios.post<AuthResponse>(
      `${API_URL}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    
    this.setToken(response.data.access_token);
    return response.data;
  }
  
  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await axios.post<User>(
      `${API_URL}/login/test-token`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    return response.data;
  }
  
  logout(): void {
    localStorage.removeItem('token');
    // También se puede añadir código para eliminar la cookie de refresh token
    // haciendo una petición al backend que elimine la cookie
  }
  
  setToken(token: string): void {
    localStorage.setItem('token', token);
  }
  
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  
  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService(); 