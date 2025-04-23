// Niveles de log
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

// Configuración global de nivel mínimo de log (se puede cambiar en tiempo de ejecución)
export const logConfig = {
  level: LogLevel.INFO, // Nivel por defecto
  enabled: true,
  storeInLocalStorage: false, // Opción para guardar logs en localStorage
  maxStoredLogs: 100, // Máximo número de logs a almacenar
  printTimestamp: true, // Mostrar timestamp en logs
};

// Definir tipo para colores de log
type LogColors = {
  debug: string;
  info: string;
  warn: string;
  error: string;
  timestamp: string;
  context: string;
}

// Colores para consola
const COLORS: LogColors = {
  debug: '#6c757d', // gris
  info: '#0dcaf0',  // celeste
  warn: '#ffc107',  // amarillo
  error: '#dc3545', // rojo
  timestamp: '#adb5bd', // gris claro para el timestamp
  context: '#20c997', // verde para contexto adicional
}

// Interfaz para mensajes de log estructurados
export interface LogMessage {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
}

// Clase principal de logger
export class Logger {
  private name: string;
  private prefix: string;

  constructor(name: string) {
    this.name = name;
    this.prefix = `[${name}]`;
  }

  private formatMessage(message: string): string {
    let formatted = '';
    
    // Añadir timestamp si está habilitado
    if (logConfig.printTimestamp) {
      const now = new Date();
      const timestamp = now.toISOString().split('T')[1].slice(0, 12);
      formatted += `%c${timestamp} `;
    }
    
    // Añadir el componente
    formatted += `%c${this.prefix} ${message}`;
    
    return formatted;
  }

  private getStyles(level: keyof typeof COLORS): string[] {
    const styles: string[] = [];
    
    if (logConfig.printTimestamp) {
      styles.push(`color: ${COLORS.timestamp}; font-size: 0.9em;`);
    }
    
    styles.push(`color: ${COLORS[level]}; font-weight: ${level === 'error' ? 'bold' : 'normal'};`);
    
    return styles;
  }

  private storeLog(level: LogLevel, message: string, data?: any): void {
    if (!logConfig.storeInLocalStorage) return;
    
    try {
      // Crear entrada de log
      const logEntry: LogMessage = {
        timestamp: new Date().toISOString(),
        level,
        component: this.name,
        message,
        data: data || undefined
      };
      
      // Obtener logs existentes o inicializar array
      const storedLogs = JSON.parse(localStorage.getItem('app_logs') || '[]');
      
      // Añadir nueva entrada y limitar tamaño
      storedLogs.push(logEntry);
      if (storedLogs.length > logConfig.maxStoredLogs) {
        storedLogs.splice(0, storedLogs.length - logConfig.maxStoredLogs);
      }
      
      // Guardar logs actualizados
      localStorage.setItem('app_logs', JSON.stringify(storedLogs));
    } catch (error) {
      console.error('Error al guardar log en localStorage:', error);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (logConfig.enabled && logConfig.level <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage(message);
      const styles = this.getStyles('debug');
      console.debug(formattedMessage, ...styles, ...args);
      this.storeLog(LogLevel.DEBUG, message, args.length ? args : undefined);
    }
  }

  info(message: string, ...args: any[]): void {
    if (logConfig.enabled && logConfig.level <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage(message);
      const styles = this.getStyles('info');
      console.info(formattedMessage, ...styles, ...args);
      this.storeLog(LogLevel.INFO, message, args.length ? args : undefined);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (logConfig.enabled && logConfig.level <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage(message);
      const styles = this.getStyles('warn');
      console.warn(formattedMessage, ...styles, ...args);
      this.storeLog(LogLevel.WARN, message, args.length ? args : undefined);
    }
  }

  error(message: string, ...args: any[]): void {
    if (logConfig.enabled && logConfig.level <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage(message);
      const styles = this.getStyles('error');
      console.error(formattedMessage, ...styles, ...args);
      this.storeLog(LogLevel.ERROR, message, args.length ? args : undefined);
    }
  }

  // Método para trunear URLs o mensajes largos en el log
  trimLongString(str: string, maxLength: number = 100): string {
    if (str && str.length > maxLength) {
      return `${str.substring(0, maxLength)}... (total ${str.length} chars)`;
    }
    return str;
  }
  
  // Método para limpiar todos los logs almacenados
  static clearStoredLogs(): void {
    localStorage.removeItem('app_logs');
  }
  
  // Método para obtener todos los logs almacenados
  static getStoredLogs(): LogMessage[] {
    try {
      return JSON.parse(localStorage.getItem('app_logs') || '[]');
    } catch (error) {
      console.error('Error al leer logs de localStorage:', error);
      return [];
    }
  }
}

// Función para obtener una instancia de logger
export function createLogger(name: string): Logger {
  return new Logger(name);
}

// Configurar nivel de log según entorno
if (import.meta.env.MODE === 'development') {
  logConfig.level = LogLevel.DEBUG;
} else {
  logConfig.level = LogLevel.INFO;
}

// Logger por defecto para uso general
export const logger = createLogger('App');

// Exponer función para exportar logs
export function exportLogs(): string {
  return JSON.stringify(Logger.getStoredLogs(), null, 2);
} 