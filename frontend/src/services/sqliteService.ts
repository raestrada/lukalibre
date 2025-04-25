import initSqlJs from 'sql.js';
import { createLogger } from '../utils/logger';

const log = createLogger('SQLiteService');

export interface SQLiteDatabaseConfig {
  name: string;
  version: string;
  description?: string;
}

class SQLiteService {
  private db: any | null = null;
  private SQL: any | null = null;
  private config: SQLiteDatabaseConfig;
  private initialized = false;

  constructor() {
    this.config = {
      name: 'lukalibre',
      version: '1.0.0',
      description: 'LukaLibre SQLite Database'
    };
  }

  /**
   * Inicializa SQL.js
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      log.info('Inicializando SQLite');
      // Cargar SQL.js
      this.SQL = await initSqlJs({
        locateFile: (file: string) => `/sql.js/${file}`
      });
      // Intentar cargar base de datos desde localStorage
      const stored = this.loadFromStorage();
      if (stored) {
        log.info('Base de datos encontrada en localStorage, cargando...');
        this.db = new this.SQL.Database(stored);
      }
      this.initialized = true;
      log.info('SQLite inicializado correctamente');
    } catch (error) {
      log.error('Error inicializando SQLite:', error);
      throw new Error('No se pudo inicializar SQLite');
    }
  }

  /**
   * Crea una nueva base de datos SQLite
   */
  async createNewDatabase(): Promise<Uint8Array> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      log.info('Creando nueva base de datos SQLite');
      this.db = new this.SQL.Database();
      // Crear las tablas según el esquema definido en el diseño
      this.createTables();
      // Exportar la base de datos como array binario
      const data = this.db.export();
      this.saveToStorage(data);
      log.info('Base de datos creada y guardada en localStorage correctamente');
      return data;
    } catch (error) {
      log.error('Error creando base de datos:', error);
      throw new Error('No se pudo crear la base de datos SQLite');
    }
  }

  /**
   * Carga una base de datos existente desde un Blob (para compatibilidad con Google Drive)
   */
  async loadDatabase(data: Uint8Array | Blob): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      log.info('Cargando base de datos SQLite existente');
      // Convertir Blob a Uint8Array si es necesario
      let dataArray: Uint8Array;
      if (data instanceof Blob) {
        const buffer = await data.arrayBuffer();
        dataArray = new Uint8Array(buffer);
      } else {
        dataArray = data;
      }
      this.db = new this.SQL.Database(dataArray);
      this.saveToStorage(dataArray);
      log.info('Base de datos cargada y guardada en localStorage correctamente');
    } catch (error) {
      log.error('Error cargando base de datos:', error);
      throw new Error('No se pudo cargar la base de datos SQLite');
    }
  }

  /**
   * Crea las tablas necesarias en la base de datos
   */
  private createTables(): void {
    log.info('Creando tablas en la base de datos');
    
    // Tabla de categorías
    this.db.exec(`
      CREATE TABLE categorias (
        id TEXT PRIMARY KEY,
        tipo TEXT CHECK (tipo IN ('ingreso', 'gasto', 'ahorro')),
        nombre TEXT NOT NULL,
        sub_tipo TEXT,
        descripcion TEXT,
        clasificacion_tributaria TEXT,
        afecta_impuestos BOOLEAN DEFAULT false,
        codigo_sii TEXT,
        tags TEXT
      );
    `);

    // Tabla de gastos
    this.db.exec(`
      CREATE TABLE gastos (
        id TEXT PRIMARY KEY,
        categoria_id TEXT REFERENCES categorias(id),
        monto REAL,
        fecha TEXT,
        fuente TEXT,
        descripcion TEXT,
        detalle TEXT
      );
    `);

    // Tabla de ingresos
    this.db.exec(`
      CREATE TABLE ingresos (
        id TEXT PRIMARY KEY,
        categoria_id TEXT REFERENCES categorias(id),
        monto REAL,
        fecha TEXT,
        descripcion TEXT,
        fuente TEXT,
        detalle TEXT
      );
    `);

    // Tabla de movimientos de ahorro
    this.db.exec(`
      CREATE TABLE movimientos_ahorro (
        id TEXT PRIMARY KEY,
        monto REAL,
        fecha TEXT,
        origen TEXT,
        destino TEXT,
        meta_id TEXT REFERENCES metas(id),
        comentario TEXT,
        detalle TEXT
      );
    `);

    // Tabla de metas
    this.db.exec(`
      CREATE TABLE metas (
        id TEXT PRIMARY KEY,
        nombre TEXT,
        descripcion TEXT,
        objetivo_monto REAL,
        fecha_objetivo TEXT,
        prioridad INTEGER,
        tipo TEXT CHECK (tipo IN ('emergencia', 'viaje', 'vivienda', 'educacion', 'jubilacion', 'otro')),
        activa BOOLEAN DEFAULT true
      );
    `);

    // Tabla de recomendaciones
    this.db.exec(`
      CREATE TABLE recomendaciones (
        id TEXT PRIMARY KEY,
        tipo TEXT,
        mensaje TEXT,
        fecha TEXT
      );
    `);

    // Tabla de resumen mensual
    this.db.exec(`
      CREATE TABLE resumen_mensual (
        mes TEXT PRIMARY KEY,
        total_gastos REAL,
        total_ingresos REAL,
        total_ahorro REAL,
        ahorro_neto REAL,
        categorias TEXT
      );
    `);

    // Tabla de metadata
    this.db.exec(`
      CREATE TABLE metadata (
        clave TEXT PRIMARY KEY,
        valor TEXT
      );
    `);
    
    // Insertar la información de la versión en la tabla de metadata
    this.db.exec(`
      INSERT INTO metadata (clave, valor) VALUES 
      ('version', '${this.config.version}'),
      ('nombre', '${this.config.name}'),
      ('ultima_sincronizacion', '${new Date().toISOString()}');
    `);
    
    log.info('Tablas creadas correctamente');
  }

  /**
   * Exporta la base de datos a un array binario
   */
  exportDatabase(): Uint8Array {
    if (!this.db) {
      throw new Error('La base de datos no está inicializada');
    }
    
    try {
      log.info('Exportando base de datos');
      return this.db.export();
    } catch (error) {
      log.error('Error exportando base de datos:', error);
      throw new Error('No se pudo exportar la base de datos');
    }
  }

  /**
   * Ejecuta una consulta SQL en la base de datos
   * @param sql Consulta SQL a ejecutar
   * @param params Parámetros para la consulta
   * @returns Resultados de la consulta
   */
  query(sql: string, params: any = {}): any[] {
    if (!this.db) {
      throw new Error('La base de datos no está inicializada');
    }
    
    try {
      log.debug('Ejecutando consulta SQL:', sql);
      const stmt = this.db.prepare(sql);
      stmt.bind(params);
      
      const results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    } catch (error) {
      log.error('Error ejecutando consulta SQL:', error);
      throw new Error(`Error en la consulta SQL: ${error}`);
    }
  }

  /**
   * Ejecuta una sentencia SQL sin retornar resultados
   * @param sql Sentencia SQL a ejecutar
   * @param params Parámetros para la sentencia
   */
  exec(sql: string, params: any = {}): void {
    if (!this.db) {
      throw new Error('La base de datos no está inicializada');
    }
    try {
      log.debug('Ejecutando sentencia SQL:', sql);
      this.db.run(sql, params);
      // Persistir la base tras cada cambio
      const data = this.db.export();
      this.saveToStorage(data);
    } catch (error) {
      log.error('Error ejecutando sentencia SQL:', error);
      throw new Error(`Error en la sentencia SQL: ${error}`);
    }
  }

  /**
   * Actualiza la fecha de última sincronización
   */
  updateSyncTimestamp(): void {
    if (!this.db) {
      throw new Error('La base de datos no está inicializada');
    }
    
    try {
      const timestamp = new Date().toISOString();
      this.exec(`
        UPDATE metadata 
        SET valor = ? 
        WHERE clave = 'ultima_sincronizacion'
      `, [timestamp]);
      
      log.info('Timestamp de sincronización actualizado:', timestamp);
    } catch (error) {
      log.error('Error actualizando timestamp:', error);
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  close(): void {
    if (this.db) {
      try {
        log.info('Cerrando conexión a la base de datos');
        this.db.close();
        this.db = null;
      } catch (error) {
        log.error('Error cerrando base de datos:', error);
      }
    }
  }

  /**
   * Devuelve un array con los nombres de todas las tablas de usuario (excluye las internas de SQLite)
   */
  listTables(): string[] {
    if (!this.db) throw new Error('La base de datos no está inicializada');
    const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';";
    const result = this.query(sql);
    return result.map((row: any) => row.name);
  }

  /**
   * Devuelve todos los registros de una tabla
   */
  getAll(table: string): any[] {
    if (!this.db) throw new Error('La base de datos no está inicializada');
    const sql = `SELECT * FROM ${table}`;
    return this.query(sql);
  }

  /**
   * Devuelve los nombres de las columnas de una tabla
   */
  getTableColumns(table: string): string[] {
    if (!this.db) throw new Error('La base de datos no está inicializada');
    const sql = `PRAGMA table_info(${table})`;
    const result = this.query(sql);
    return result.map((row: any) => row.name);
  }
  /**
   * Guarda el array binario de la base de datos en localStorage
   */
  private saveToStorage(data: Uint8Array): void {
    try {
      const base64 = btoa(String.fromCharCode(...data));
      localStorage.setItem('lukalibre_sqlite_db', base64);
      log.info('Base de datos guardada en localStorage');
    } catch (err) {
      log.error('Error guardando base de datos en localStorage:', err);
    }
  }

  /**
   * Carga la base de datos desde localStorage, si existe
   */
  private loadFromStorage(): Uint8Array | null {
    try {
      const base64 = localStorage.getItem('lukalibre_sqlite_db');
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      log.info('Base de datos cargada desde localStorage');
      return bytes;
    } catch (err) {
      log.error('Error cargando base de datos desde localStorage:', err);
      return null;
    }
  }
}

export default new SQLiteService(); 