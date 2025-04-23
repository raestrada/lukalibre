import { createLogger } from '../utils/logger';
import authService from './authService';

const log = createLogger('GoogleDriveService');

// Nombre del archivo de base de datos en Google Drive
const DB_FILE_NAME = 'lukalibre.wallet';
// Mime type para la búsqueda
const DB_MIME_TYPE = 'application/octet-stream';
// Intervalo predeterminado para sincronización automática (30 minutos)
const DEFAULT_SYNC_INTERVAL = 30 * 60 * 1000;

// Alcances requeridos para Google Drive
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

// Definir los tipos necesarios para GAPI
interface GoogleAuth {
  isSignedIn: {
    get: () => boolean;
    listen: (callback: (isSignedIn: boolean) => void) => void;
  };
  signIn: (options?: any) => Promise<any>;
  signOut: () => Promise<void>;
  currentUser: {
    get: () => {
      getAuthResponse: () => {
        access_token: string;
      };
    };
  };
}

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

declare global {
  interface Window {
    gapi: {
      load: (libraries: string, options: { callback: () => void; onerror: (error: any) => void }) => void;
      client: {
        init: (options: any) => Promise<void>;
        drive: any;
        getToken: () => { access_token: string };
      };
      auth2: {
        getAuthInstance: () => GoogleAuth;
        init: (options: any) => Promise<any>;
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => {
            requestAccessToken: (options?: any) => Promise<{access_token: string}>;
          };
        }
      };
    };
  }
}

class GoogleDriveService {
  private syncIntervalId: number | null = null;
  private syncInterval: number = DEFAULT_SYNC_INTERVAL;
  private gapiInitialized = false;
  private accessToken: string | null = null;

  /**
   * Inicializa la API de Google y obtiene un token de acceso
   */
  async initialize(): Promise<void> {
    if (this.gapiInitialized && this.accessToken) {
      return;
    }

    try {
      log.info('Inicializando Google Drive API');
      
      // Verificar si estamos esperando un token de autenticación
      const isPending = localStorage.getItem('pendingGoogleAuth');
      if (isPending === 'true') {
        log.info('Detectada autorización pendiente, esperando resultado...');
        
        // Si estamos aquí, significa que acabamos de ser redirigido desde la página de auth callback
        // Dar tiempo a que el callback procese el token antes de continuar
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Limpiamos el estado pendiente
        localStorage.removeItem('pendingGoogleAuth');
      }
      
      // 1. Intentar extraer el token de acceso de la URL (después de la redirección de OAuth)
      this.extractTokenFromUrl();
      
      // 2. Si no tenemos token en la URL, intentar obtenerlo de localStorage
      if (!this.accessToken) {
        const savedToken = localStorage.getItem('googleDriveToken');
        if (savedToken) {
          log.info('Token de acceso obtenido de localStorage');
          this.accessToken = savedToken;
        }
      }
      
      // 3. Si todavía no tenemos token, intentar otras formas
      if (!this.accessToken) {
        await this.getAccessToken();
      }
      
      this.gapiInitialized = true;
      log.info('Google Drive API inicializada correctamente');
    } catch (error) {
      log.error('Error inicializando Google Drive API:', error);
      throw new Error('No se pudo inicializar Google Drive API');
    }
  }

  /**
   * Extrae el token de acceso de la URL después de la redirección de OAuth
   */
  private extractTokenFromUrl(): void {
    // Verificar si estamos en la URL de redirección con un token
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      // Convertir el fragmento de URL hash en un objeto
      const params = new URLSearchParams(hash.substring(1)); // Quitar el # inicial
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        log.info('Token de acceso extraído de la URL');
        this.accessToken = accessToken;
        
        // Limpiar la URL para no mostrar el token
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  /**
   * Obtiene un token de acceso para la API de Google Drive
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken) {
      return this.accessToken;
    }

    try {
      // 1. Verificar si hay un token guardado en localStorage
      const savedToken = localStorage.getItem('googleDriveToken');
      if (savedToken) {
        log.info('Token de acceso recuperado de localStorage');
        this.accessToken = savedToken;
        return this.accessToken;
      }
      
      // 2. Comprobar si gapi está disponible y el cliente está inicializado
      if (window.gapi && window.gapi.client) {
        try {
          // Obtener el token directamente del cliente gapi si está disponible
          const tokenInfo = window.gapi.client.getToken();
          if (tokenInfo && tokenInfo.access_token) {
            this.accessToken = tokenInfo.access_token;
            log.info('Token de acceso obtenido desde gapi.client');
            
            // Guardar el token para futuras sesiones
            localStorage.setItem('googleDriveToken', this.accessToken);
            
            return this.accessToken;
          }
        } catch (gapiError) {
          log.warn('No se pudo obtener token desde gapi.client:', gapiError);
        }
      }
      
      // 3. Si no se pudo obtener el token por ninguno de los métodos, redireccionar para autorización
      log.info('Redireccionando para autorización OAuth...');
      this.redirectToGoogleAuth();
      throw new Error('Se requiere autorización de Google Drive');
    } catch (error) {
      log.error('Error obteniendo token de acceso:', error);
      throw error;
    }
  }

  /**
   * Redirecciona al usuario a la página de autorización de Google
   */
  private redirectToGoogleAuth(): void {
    const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
    
    // Usar exactamente el URI de redirección que está registrado en la consola de Google Cloud
    const redirectUri = 'http://localhost:8000/api/v1/auth/google/callback';
    
    // Guardar la URL actual para volver después de la autenticación
    const returnToUrl = window.location.href;
    localStorage.setItem('googleAuthReturnUrl', returnToUrl);
    
    const params = new URLSearchParams({
      scope: SCOPES.join(' '),
      client_id: '925447738867-05dtp8ffuohbj9jhnfbd27grkn0m1bad.apps.googleusercontent.com',
      redirect_uri: redirectUri,
      // Usar code en lugar de token para evitar problemas de validación
      response_type: 'code',
      // Indicar que es una aplicación en modo de desarrollo 
      include_granted_scopes: 'true',
      prompt: 'consent',
      state: 'googleDriveAuth'
    });

    // Guardar en localStorage que estamos esperando una respuesta de Google
    localStorage.setItem('pendingGoogleAuth', 'true');
    
    window.location.href = `${authUrl}?${params.toString()}`;
  }

  /**
   * Verifica si el usuario está autenticado con Google 
   * y tiene acceso a Drive
   * @param forceRedirect Si es true, redirige a la página de autenticación si no está autenticado
   */
  async ensureAuthenticated(forceRedirect: boolean = false): Promise<boolean> {
    try {
      // Si ya tenemos un token, considerarnos autenticados
      if (this.accessToken) {
        log.info('Ya existe un token de acceso, usuario autenticado');
        return true;
      }
      
      // Intentar obtener el token de localStorage
      const savedToken = localStorage.getItem('googleDriveToken');
      if (savedToken) {
        log.info('Token encontrado en localStorage, usuario autenticado');
        this.accessToken = savedToken;
        return true;
      }
      
      // Intentar obtener el token del navegador si está disponible
      if (window.gapi && window.gapi.client) {
        try {
          const tokenInfo = window.gapi.client.getToken();
          if (tokenInfo && tokenInfo.access_token) {
            log.info('Token encontrado en gapi.client, usuario autenticado');
            this.accessToken = tokenInfo.access_token;
            localStorage.setItem('googleDriveToken', this.accessToken);
            return true;
          }
        } catch (error) {
          log.warn('No se pudo obtener token de gapi.client:', error);
        }
      }
      
      // Aquí es donde decidiríamos si redirigir o no
      if (forceRedirect) {
        // Solo redirigir si explícitamente se solicita
        // Esto solo debe ocurrir cuando el usuario activa manualmente la sincronización
        log.info('Redirigiendo a autenticación de Google (solicitado explícitamente)');
        this.redirectToGoogleAuth();
      } else {
        log.info('Usuario no autenticado, pero no se fuerza redirección');
      }
      
      return false;
    } catch (error) {
      log.error('Error verificando autenticación:', error);
      return false;
    }
  }

  /**
   * Busca el archivo de base de datos en Google Drive
   * @returns Información del archivo si existe, null en caso contrario
   */
  async findDatabaseFile(): Promise<GoogleDriveFile | null> {
    try {
      log.info('Buscando archivo de base de datos en Google Drive');
      
      // Asegurar que exista un token de acceso
      await this.initialize();
      
      // Intentar obtener el token directamente del navegador si está disponible
      let token = this.accessToken;
      if (!token && window.gapi?.client?.getToken) {
        const tokenObj = window.gapi.client.getToken();
        if (tokenObj) {
          token = tokenObj.access_token;
          log.info('Usando token existente del navegador para buscar archivo');
        }
      }
      
      if (!token) {
        log.info('No se encontró token en el navegador, obteniendo mediante OAuth');
        token = await this.getAccessToken();
      }
      
      // Construir la consulta para buscar en la carpeta principal (no en appDataFolder)
      const query = encodeURIComponent(`name='${DB_FILE_NAME}' and trashed=false`);
      
      // Realizar solicitud REST directa para buscar el archivo
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&spaces=drive&fields=files(id,name,modifiedTime,size)`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error('Error al buscar archivo:', errorText);
        throw new Error(`Error al buscar archivo en Google Drive: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.files && data.files.length > 0) {
        log.info('Archivo encontrado:', data.files[0].id);
        return data.files[0] as GoogleDriveFile;
      }
      
      log.info('Archivo no encontrado');
      return null;
    } catch (error) {
      log.error('Error buscando archivo de base de datos:', error);
      throw error;
    }
  }

  /**
   * Descarga el archivo de la base de datos desde Google Drive
   * @param fileId ID del archivo a descargar
   * @returns Contenido del archivo como Blob
   */
  async downloadDatabaseFile(fileId: string): Promise<Blob> {
    try {
      log.info('Descargando archivo de base de datos:', fileId);
      
      await this.initialize();
      
      // Intentar obtener el token directamente del navegador si está disponible
      let token = this.accessToken;
      if (!token && window.gapi?.client?.getToken) {
        const tokenObj = window.gapi.client.getToken();
        if (tokenObj) {
          token = tokenObj.access_token;
          log.info('Usando token existente del navegador para descargar archivo');
        }
      }
      
      if (!token) {
        log.info('No se encontró token en el navegador, obteniendo mediante OAuth');
        token = await this.getAccessToken();
      }
      
      // Realizar solicitud REST directa para descargar el archivo
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error('Error al descargar archivo:', errorText);
        throw new Error(`Error al descargar archivo desde Google Drive: ${response.status}`);
      }
      
      const blob = await response.blob();
      log.info('Archivo descargado correctamente:', fileId, `(${blob.size} bytes)`);
      return blob;
    } catch (error) {
      log.error('Error descargando archivo:', error);
      throw error;
    }
  }

  /**
   * Sube el archivo de base de datos a Google Drive
   * @param fileData Datos del archivo a subir
   * @returns Información del archivo subido
   */
  async uploadDatabaseFile(fileData: Uint8Array | Blob): Promise<{ id: string; name: string }> {
    try {
      log.info('Subiendo archivo de base de datos a Google Drive');
      
      await this.initialize();
      
      // Intentar obtener el token directamente del navegador si está disponible
      let token = this.accessToken;
      if (!token && window.gapi?.client?.getToken) {
        const tokenObj = window.gapi.client.getToken();
        if (tokenObj) {
          token = tokenObj.access_token;
          log.info('Usando token existente del navegador para subir archivo');
        }
      }
      
      if (!token) {
        log.info('No se encontró token en el navegador, obteniendo mediante OAuth');
        token = await this.getAccessToken();
      }
      
      // Buscar si ya existe un archivo de base de datos
      const existingFile = await this.findDatabaseFile();
      
      // Preparar los datos del archivo como Blob si es necesario
      const blob = fileData instanceof Blob ? fileData : new Blob([fileData]);
      log.info(`Preparado archivo para subir: ${blob.size} bytes`);
      
      // Crear el FormData para la carga
      const formData = new FormData();
      const metadata = {
        name: DB_FILE_NAME,
        // Guardar en la carpeta principal (root folder)
        parents: ['root'],
        mimeType: 'application/octet-stream',
        description: 'LukaLibre Wallet Database File'
      };
      
      log.info('Metadata para la carga:', JSON.stringify(metadata));
      
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      
      formData.append('file', blob);
      
      // URL para crear o actualizar el archivo
      const url = existingFile
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      
      // Método HTTP según sea crear o actualizar
      const method = existingFile ? 'PATCH' : 'POST';
      
      log.info(`Enviando solicitud ${method} a ${url}`);
      
      // Realizar la solicitud REST
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        log.error(`Error al subir archivo (${response.status}):`, errorText);
        throw new Error(`Error al subir archivo a Google Drive: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      log.info('Archivo subido correctamente. ID:', result.id, 'Nombre:', result.name);
      
      // Mostrar link para verificar (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        log.info(`Archivo disponible en: https://drive.google.com/file/d/${result.id}/view`);
      }
      
      return {
        id: result.id,
        name: result.name
      };
    } catch (error) {
      log.error('Error subiendo archivo:', error);
      throw error;
    }
  }

  /**
   * Inicia la sincronización automática con Google Drive
   * @param interval Intervalo en milisegundos entre sincronizaciones
   * @param callback Función de callback que provee los datos a sincronizar
   */
  startAutoSync(interval: number = DEFAULT_SYNC_INTERVAL, callback: () => Promise<Uint8Array>): void {
    // Detener cualquier sincronización existente
    this.stopAutoSync();
    
    this.syncInterval = interval;
    log.info(`Iniciando sincronización automática cada ${interval / 60000} minutos`);
    
    // Crear la primera sincronización inmediata
    this.syncIntervalId = window.setTimeout(async () => {
      try {
        await this.performSync(callback);
      } catch (error) {
        log.error('Error en sincronización inicial:', error);
      }
      
      // Configurar el intervalo recurrente
      this.syncIntervalId = window.setInterval(async () => {
        try {
          await this.performSync(callback);
        } catch (error) {
          log.error('Error en sincronización automática:', error);
        }
      }, this.syncInterval);
    }, 1000); // Primera sincronización después de 1 segundo
  }

  /**
   * Detiene la sincronización automática
   */
  stopAutoSync(): void {
    if (this.syncIntervalId !== null) {
      window.clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      log.info('Sincronización automática detenida');
    }
  }

  /**
   * Realiza la sincronización con Google Drive
   * @param callback Función que proporciona los datos actualizados a sincronizar
   */
  private async performSync(callback: () => Promise<Uint8Array>): Promise<void> {
    try {
      log.info('Ejecutando sincronización con Google Drive');
      
      // Obtener los datos actualizados de la base de datos
      const data = await callback();
      
      // Subir a Google Drive
      await this.uploadDatabaseFile(data);
      
      log.info('Sincronización completada exitosamente');
    } catch (error) {
      log.error('Error durante la sincronización:', error);
      throw error;
    }
  }
  
  /**
   * Cierra la sesión (limpia el token de acceso)
   */
  async signOut(): Promise<void> {
    this.accessToken = null;
    // Eliminar el token de localStorage
    localStorage.removeItem('googleDriveToken');
    localStorage.removeItem('pendingGoogleAuth');
    
    // Intentar cerrar sesión en gapi si está disponible
    if (window.gapi && window.gapi.auth2) {
      try {
        const authInstance = window.gapi.auth2.getAuthInstance();
        if (authInstance) {
          await authInstance.signOut();
        }
      } catch (error) {
        log.warn('Error al cerrar sesión en gapi:', error);
      }
    }
    
    log.info('Sesión cerrada, token de acceso eliminado');
  }

  /**
   * Establece explícitamente el token de acceso
   * @param token El token de acceso a establecer
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    log.info('Token de acceso establecido manualmente');
    
    // También guardar en localStorage para persistencia
    localStorage.setItem('googleDriveToken', token);
  }
}

export default new GoogleDriveService(); 