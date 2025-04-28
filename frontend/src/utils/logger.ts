/**
 * Niveles de logging disponibles
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Configuración del logger
 */
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  prefix: string;
  maxStringLength: number;
}

/**
 * Configuración global del logger
 */
const globalConfig: LoggerConfig = {
  minLevel: import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  prefix: '[LukaLibre]',
  maxStringLength: 500,
};

/**
 * Crea un nuevo logger para un componente específico
 * @param module Nombre del módulo o componente
 * @returns Objeto logger con métodos de logging
 */
export function createLogger(module: string) {
  const modulePrefix = `${globalConfig.prefix} [${module}]`;

  /**
   * Determina si un mensaje de un nivel específico debe ser mostrado
   * @param level Nivel de log a verificar
   * @returns true si el mensaje debe ser mostrado
   */
  function shouldLog(level: LogLevel): boolean {
    return level >= globalConfig.minLevel && globalConfig.enableConsole;
  }

  /**
   * Acorta una cadena larga para evitar que sature la consola
   * @param value Valor a acortar
   * @returns Cadena acortada si es muy larga
   */
  function trimLongString(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    if (value.length > globalConfig.maxStringLength) {
      return `${value.substring(0, globalConfig.maxStringLength)}... (${value.length - globalConfig.maxStringLength} more chars)`;
    }

    return value;
  }

  /**
   * Formatea los argumentos del log para mostrarlos correctamente
   * @param args Argumentos a formatear
   * @returns Argumentos formateados
   */
  function formatArgs(args: any[]): any[] {
    return args.map((arg) => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          // Para objetos, clonarlos para evitar referencia circular
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return '[Objeto no serializable]';
        }
      }
      return trimLongString(arg);
    });
  }

  return {
    debug(...args: any[]): void {
      if (shouldLog(LogLevel.DEBUG)) {
        console.debug(modulePrefix, ...formatArgs(args));
      }
    },

    info(...args: any[]): void {
      if (shouldLog(LogLevel.INFO)) {
        console.info(modulePrefix, ...formatArgs(args));
      }
    },

    warn(...args: any[]): void {
      if (shouldLog(LogLevel.WARN)) {
        console.warn(modulePrefix, ...formatArgs(args));
      }
    },

    error(...args: any[]): void {
      if (shouldLog(LogLevel.ERROR)) {
        console.error(modulePrefix, ...formatArgs(args));
      }
    },

    // Utilidad para acortar cadenas
    trimLongString,
  };
}

/**
 * Configura los parámetros globales del logger
 * @param config Configuración a aplicar
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  Object.assign(globalConfig, config);
}

// Logger global
export default createLogger('App');
