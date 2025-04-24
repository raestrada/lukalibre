import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { createLogger } from '../utils/logger';

const log = createLogger('HttpService');

// Obtenemos la URL de la API desde las variables de entorno
export const API_URL = `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PATH}`;

class HttpService {
  private api: AxiosInstance;
  
  constructor() {
    this.api = axios.create({
      baseURL: API_URL
    });
    
    // Configurar interceptores
    this.setupInterceptors();
  }
  
  private setupInterceptors() {
    // Interceptor de peticiones
    this.api.interceptors.request.use(
      (config) => {
        // Añadir token de autenticación si existe
        const token = localStorage.getItem('token');
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        log.error('Error en interceptor de petición:', error);
        return Promise.reject(error);
      }
    );
    
    // Interceptor de respuestas
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Manejar errores de red
        if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
          log.warn('Error de red detectado');
          // Se puede implementar lógica para modo offline aquí
        }
        
        return Promise.reject(error);
      }
    );
  }
  
  // Métodos HTTP genéricos
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.api.get<T>(url, config);
    } catch (error) {
      log.error(`Error en GET ${url}:`, error);
      throw error;
    }
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.api.post<T>(url, data, config);
    } catch (error) {
      log.error(`Error en POST ${url}:`, error);
      throw error;
    }
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.api.put<T>(url, data, config);
    } catch (error) {
      log.error(`Error en PUT ${url}:`, error);
      throw error;
    }
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    try {
      return await this.api.delete<T>(url, config);
    } catch (error) {
      log.error(`Error en DELETE ${url}:`, error);
      throw error;
    }
  }
  
  // Método para obtener la instancia de axios si es necesario
  getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

export default new HttpService(); 