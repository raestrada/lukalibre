import httpService from './httpService';
import { createLogger } from '../utils/logger';
import sqliteService from './sqliteService';
import googleDriveService from './googleDriveService';
import databaseService from './databaseService';

// Logger específico para este servicio
const log = createLogger('DataService');

export type SyncSource = 'local' | 'google_drive' | 'none';
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';

/**
 * Servicio centralizado para el acceso a datos y sincronización
 */
class DataService {
  private initialized = false;
  private syncSource: SyncSource = 'none';
  private syncStatus: SyncStatus = 'offline';

  /**
   * Devuelve los schemas disponibles (mock temporal)
   */
  async getSchemas(): Promise<any[]> {
    const resp = await httpService.get('/schemas', {
      headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
    });
    // Compatibilidad: si la API devuelve meta.schema, adaptamos
    return (resp.data || []).map((s: any) => ({
      name: s.name,
      schema: s.meta?.schema || s.schema || s.meta || {},
    }));
  }

  /**
   * Inicializa los servicios de datos requeridos
   */
  async initialize(preferredSource: SyncSource = 'local'): Promise<boolean> {
    if (this.initialized) {
      log.debug('DataService ya inicializado');
      return true;
    }

    try {
      log.info('Inicializando DataService');
      // Inicializar SQLite primero (es la base de persistencia local)
      await sqliteService.initialize();

      // Comprobar y establecer fuente de datos preferida
      if (preferredSource === 'google_drive') {
        await this.initializeGoogleDrive();
      } else {
        await this.initializeLocalDatabase();
      }

      this.initialized = true;
      log.info('DataService inicializado correctamente');
      return true;
    } catch (error) {
      log.error('Error inicializando DataService:', error);
      // Si hay un error, intentar modo offline con base de datos local
      try {
        await this.initializeLocalDatabase();
        this.initialized = true;
        log.warn('DataService inicializado en modo offline');
        return true;
      } catch (fallbackError) {
        log.error(
          'Error crítico en inicialización, no hay persistencia disponible:',
          fallbackError,
        );
        return false;
      }
    }
  }

  /**
   * Inicializa la base de datos local
   */
  private async initializeLocalDatabase(): Promise<void> {
    log.debug('Inicializando base de datos local');
    await databaseService.init();
    this.syncSource = 'local';
    this.syncStatus = 'offline';
  }

  /**
   * Inicializa y sincroniza con Google Drive
   */
  private async initializeGoogleDrive(): Promise<void> {
    log.debug('Inicializando sincronización con Google Drive');

    try {
      // Verificar si hay token para Google Drive
      const token = localStorage.getItem('googleDriveToken');
      if (!token) {
        log.warn('No hay token de Google Drive disponible');
        throw new Error('Token de Google Drive no disponible');
      }

      // Intentar establecer el token
      await googleDriveService.setAccessToken(token);

      // Intentar sincronizar
      this.syncStatus = 'syncing';
      await databaseService.syncWithGoogleDrive();

      this.syncSource = 'google_drive';
      this.syncStatus = 'synced';
      log.info('Sincronización con Google Drive completada');
    } catch (error) {
      log.error('Error sincronizando con Google Drive:', error);
      // Fallar pero permitir continuar con la base local
      await this.initializeLocalDatabase();
      throw error;
    }
  }

  /**
   * Ejecuta una consulta en la base de datos
   */
  async query<T = any>(sql: string, params?: any): Promise<T[]> {
    this.ensureInitialized();
    return databaseService.query(sql, params);
  }

  /**
   * Ejecuta una operación SQL sin retorno de datos
   */
  async execute(sql: string, params?: any): Promise<void> {
    this.ensureInitialized();
    await databaseService.execute(sql, params);

    // Si estamos sincronizados con Google Drive, actualizar timestamp
    if (this.syncSource === 'google_drive' && this.syncStatus === 'synced') {
      databaseService.updateSyncTimestamp();
    }
  }

  /**
   * Sincroniza la base de datos con Google Drive
   */
  async syncWithGoogleDrive(): Promise<boolean> {
    try {
      this.ensureInitialized();
      this.syncStatus = 'syncing';

      await databaseService.syncWithGoogleDrive();

      this.syncSource = 'google_drive';
      this.syncStatus = 'synced';
      log.info('Sincronización con Google Drive completada');
      return true;
    } catch (error) {
      log.error('Error sincronizando con Google Drive:', error);
      this.syncStatus = 'error';
      return false;
    }
  }

  /**
   * Obtiene el estado actual de sincronización
   */
  getSyncStatus(): { source: SyncSource; status: SyncStatus } {
    return {
      source: this.syncSource,
      status: this.syncStatus,
    };
  }

  /**
   * Verifica que el servicio esté inicializado
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DataService no está inicializado. Llama a initialize() primero.');
    }
  }
}

export default new DataService();
