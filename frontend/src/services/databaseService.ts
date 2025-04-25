import { createLogger } from '../utils/logger';
import sqliteService from './sqliteService';
import googleDriveService from './googleDriveService';
import authService from './authService';
import { get } from 'svelte/store';
import { authStore } from '../stores/authStore';
import { settingsStore } from '../stores/settingsStore';

const log = createLogger('DatabaseService');

// Intervalo de sincronización predeterminado (30 minutos)
const DEFAULT_SYNC_INTERVAL = 30 * 60 * 1000;

class DatabaseService {
  private initialized = false;
  private syncEnabled = false;
  
  /**
   * Inicializa el servicio de base de datos
   * Crea o carga la base de datos local.
   * Solo intenta recuperar de Google Drive si la sincronización está habilitada.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      log.info('Inicializando servicio de base de datos');
      
      // Verificar si el usuario está autenticado
      const isAuthenticated = authService.isLoggedIn();
      
      if (!isAuthenticated) {
        log.warn('Usuario no autenticado, no se puede inicializar la base de datos');
        return;
      }
      
      // Inicializar SQLite
      await sqliteService.initialize();
      
      // Cargar configuración del usuario - por defecto, sincronización desactivada
      const settings = get(settingsStore);
      this.syncEnabled = settings.syncEnabled;
      
      log.info(`Sincronización ${this.syncEnabled ? 'habilitada' : 'deshabilitada'} según preferencias del usuario`);
      
      // Por defecto, usar base de datos local siempre
      let dbCreated = false;
      
      // Si la sincronización está habilitada, intentar recuperar de Google Drive
      if (this.syncEnabled) {
        log.info('Sincronización habilitada. Intentando recuperar base de datos de Google Drive');
        
        try {
          // Comprobar si el usuario ya tiene token pero SIN forzar redirección
          const isGoogleAuthenticated = await googleDriveService.ensureAuthenticated(false);
          
          if (isGoogleAuthenticated) {
            // Buscar archivo en Google Drive
            const dbFile = await googleDriveService.findDatabaseFile();
            
            if (dbFile) {
              // Descargar y cargar la base de datos
              log.info('Base de datos encontrada en Google Drive, descargando...');
              const data = await googleDriveService.downloadDatabaseFile(dbFile.id);
              await sqliteService.loadDatabase(data);
              log.info('Base de datos cargada correctamente desde Google Drive');
              
              // Actualizar la fecha de última sincronización
              settingsStore.updateSetting('lastSyncDate', new Date().toISOString());
              dbCreated = true;
            }
          } else {
            log.info('No hay token de Google Drive, se usará base de datos local');
          }
        } catch (error) {
          log.error('Error recuperando base de datos de Google Drive:', error);
        }
      }
      
      // Si no se creó la base de datos de Google Drive, usar la persistida local o crear una nueva si no existe
      if (!dbCreated) {
        // Si ya hay una base cargada en memoria, no hacer nada
        if (sqliteService.isInitialized()) {
          log.info('Base de datos ya cargada en memoria, no se crea una nueva.');
        } else {
          // Si hay una base persistida en localStorage, cargarla
          const stored = sqliteService["loadFromStorage"]?.();
          if (stored) {
            log.info('Base de datos encontrada en localStorage, cargando...');
            await sqliteService.loadDatabase(stored);
          } else {
            log.info('No existe base de datos local, creando nueva.');
            await sqliteService.createNewDatabase();
          }
        }
      }
      
      // Iniciar sincronización automática si está habilitada
      if (this.syncEnabled) {
        const syncIntervalMinutes = settings.syncInterval || 30;
        this.startAutoSync(syncIntervalMinutes * 60 * 1000);
      }
      
      this.initialized = true;
      log.info('Servicio de base de datos inicializado correctamente');
    } catch (error) {
      log.error('Error inicializando servicio de base de datos:', error);
      throw new Error('No se pudo inicializar el servicio de base de datos');
    }
  }
  
  /**
   * Ejecuta una consulta SQL en la base de datos
   * @param sql Consulta SQL
   * @param params Parámetros para la consulta
   * @returns Resultados de la consulta
   */
  async query(sql: string, params: any = {}): Promise<any[]> {
    await this.ensureInitialized();
    return sqliteService.query(sql, params);
  }
  
  /**
   * Ejecuta una sentencia SQL sin retornar resultados
   * @param sql Sentencia SQL
   * @param params Parámetros para la sentencia
   */
  async exec(sql: string, params: any = {}): Promise<void> {
    await this.ensureInitialized();
    sqliteService.exec(sql, params);
  }

  /**
   * Ejecuta múltiples sentencias SQL separadas por punto y coma
   */
  async execMultiple(sqlMultiple: string): Promise<void> {
    await this.ensureInitialized();
    sqliteService.execMultiple(sqlMultiple);
  }
  
  /**
   * Sincroniza la base de datos con Google Drive manualmente
   */
  async syncNow(): Promise<void> {
    await this.ensureInitialized();
    
    try {
      log.info('Iniciando sincronización manual con Google Drive');
      
      // Verificar si ya tenemos un token (no debería reiniciar el flujo si ya está autenticado)
      // Aquí SÍ forzamos la redirección para que el usuario pueda autenticarse
      const isAuthenticated = await googleDriveService.ensureAuthenticated(true);
      if (!isAuthenticated) {
        log.warn('No autenticado con Google Drive, iniciando flujo de autenticación');
        throw new Error('No se pudo autenticar con Google Drive');
      }
      
      log.info('Autenticación exitosa, exportando base de datos local');
      
      // Actualizar el timestamp de sincronización
      sqliteService.updateSyncTimestamp();
      
      // Exportar la base de datos
      const data = sqliteService.exportDatabase();
      
      if (!data || data.byteLength === 0) {
        throw new Error('No se pudieron exportar datos de la base de datos local');
      }
      
      log.info(`Base de datos exportada correctamente (${data.byteLength} bytes)`);
      
      // Subir a Google Drive
      log.info('Subiendo archivo a Google Drive...');
      const result = await googleDriveService.uploadDatabaseFile(data);
      
      // Actualizar la fecha de última sincronización
      settingsStore.updateSetting('lastSyncDate', new Date().toISOString());
      
      log.info('Sincronización manual completada exitosamente. ID del archivo:', result.id);
    } catch (error) {
      log.error('Error al sincronizar con Google Drive:', error);
      throw error;
    }
  }
  
  /**
   * Activa o desactiva la sincronización automática
   * @param enabled Verdadero para activar, falso para desactivar
   * @param intervalMinutes Intervalo de sincronización en minutos (opcional)
   */
  setSyncEnabled(enabled: boolean, intervalMinutes?: number): void {
    this.syncEnabled = enabled;
    
    // Guardar la configuración
    const settings: Partial<any> = { syncEnabled: enabled };
    if (intervalMinutes) {
      settings.syncInterval = intervalMinutes;
    }
    settingsStore.updateSettings(settings);
    
    if (enabled) {
      // Iniciar sincronización si está habilitada
      if (this.initialized) {
        const interval = intervalMinutes ? intervalMinutes * 60 * 1000 : DEFAULT_SYNC_INTERVAL;
        this.startAutoSync(interval);
      }
    } else {
      // Detener sincronización si está deshabilitada
      this.stopAutoSync();
    }
    
    log.info(`Sincronización automática ${enabled ? 'activada' : 'desactivada'}`);
  }
  
  /**
   * Exporta la base de datos actual como Blob para descarga
   */
  async exportDatabaseForDownload(): Promise<Blob> {
    await this.ensureInitialized();
    
    try {
      log.info('Exportando base de datos para descarga');
      
      // Actualizar timestamp antes de exportar
      sqliteService.updateSyncTimestamp();
      
      // Exportar datos
      const data = sqliteService.exportDatabase();
      
      // Convertir a Blob
      return new Blob([data], { type: 'application/octet-stream' });
    } catch (error) {
      log.error('Error exportando base de datos para descarga:', error);
      throw new Error('No se pudo exportar la base de datos');
    }
  }
  
  /**
   * Importa una base de datos desde un archivo subido por el usuario
   * @param file Archivo seleccionado por el usuario
   */
  async importDatabaseFromFile(file: File): Promise<void> {
    await this.ensureInitialized();
    
    try {
      log.info('Importando base de datos desde archivo:', file.name);
      
      // Leer el archivo como ArrayBuffer
      const buffer = await file.arrayBuffer();
      
      // Convertir a Uint8Array
      const data = new Uint8Array(buffer);
      
      // Cargar en SQLite
      await sqliteService.loadDatabase(data);
      
      log.info('Base de datos importada correctamente');
      
      // Si la sincronización está activada, subir a Google Drive
      if (this.syncEnabled) {
        try {
          log.info('Subiendo base de datos importada a Google Drive');
          await this.syncNow();
        } catch (syncError) {
          log.warn('No se pudo sincronizar la base de datos importada:', syncError);
          // No propagar el error de sincronización, la importación local ya fue exitosa
        }
      }
    } catch (error) {
      log.error('Error importando base de datos:', error);
      throw new Error('No se pudo importar la base de datos');
    }
  }
  
  /**
   * Inicia la sincronización automática con Google Drive
   * @param interval Intervalo en milisegundos entre sincronizaciones
   */
  startAutoSync(interval: number = DEFAULT_SYNC_INTERVAL): void {
    // Solo iniciar si la sincronización está habilitada
    if (!this.syncEnabled) {
      log.info('No se inicia sincronización automática porque está deshabilitada');
      return;
    }
    
    // Solo iniciar si la base de datos está inicializada
    if (!this.initialized) {
      log.warn('Base de datos no inicializada, no se inicia sincronización automática');
      return;
    }
    
    // Configurar el callback para la sincronización
    googleDriveService.startAutoSync(interval, async () => {
      // Actualizar el timestamp antes de exportar
      sqliteService.updateSyncTimestamp();
      // Exportar la base de datos actual
      return sqliteService.exportDatabase();
    });
    
    log.info(`Sincronización automática iniciada cada ${interval / 60000} minutos`);
  }
  
  /**
   * Detiene la sincronización automática
   */
  stopAutoSync(): void {
    googleDriveService.stopAutoSync();
    log.info('Sincronización automática detenida');
  }
  
  /**
   * Asegura que el servicio esté inicializado antes de usarlo
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      
      if (!this.initialized) {
        throw new Error('No se pudo inicializar el servicio de base de datos');
      }
    }
  }
  
  /**
   * Cierra la conexión a la base de datos
   */
  close(): void {
    if (this.initialized) {
      // Detener sincronización automática
      this.stopAutoSync();
      
      // Cerrar la conexión a SQLite
      sqliteService.close();
      this.initialized = false;
      
      log.info('Servicio de base de datos cerrado');
    }
  }
  
  /**
   * Devuelve un array con los nombres de todas las tablas de usuario
   */
  async listTables(): Promise<string[]> {
    await this.ensureInitialized();
    return sqliteService.listTables();
  }

  /**
   * Devuelve todos los registros de una tabla
   */
  async getAll(table: string): Promise<any[]> {
    await this.ensureInitialized();
    return sqliteService.getAll(table);
  }

  /**
   * Devuelve los nombres de las columnas de una tabla
   */
  async getTableColumns(table: string): Promise<string[]> {
    await this.ensureInitialized();
    return sqliteService.getTableColumns(table);
  }

  /**
   * Resetea la base de datos local y en memoria
   */
  public async resetDatabase(): Promise<void> {
    await sqliteService.resetDatabase();
  }

  /**
   * Sincroniza la base de datos con Google Drive
   */
  public async syncDatabase(): Promise<void> {
    // Por ahora, simplemente retornamos una promesa resuelta
    // La implementación completa dependería de la lógica de sincronización con Google Drive
    log.info('Sincronizando base de datos con Google Drive');
    return Promise.resolve();
  }
  /**
   * Devuelve todas las metas financieras
   */
  async getMetas(): Promise<any[]> {
    return this.getAll('metas');
  }
}

export default new DatabaseService();