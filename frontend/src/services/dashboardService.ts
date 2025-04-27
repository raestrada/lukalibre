import { createLogger } from '../utils/logger';
import sqliteService from './sqliteService';
import httpService from './httpService';
import * as llmService from './llmService';

const log = createLogger('DashboardService');

/**
 * Exporta toda la base de datos a formato JSON para análisis
 */
export async function exportDatabaseToJson(): Promise<any> {
  try {
    log.info('Exportando base de datos a JSON');
    
    if (!sqliteService.isInitialized()) {
      throw new Error('La base de datos no está inicializada');
    }
    
    // Estructura para almacenar todos los datos
    const dbData: Record<string, any[]> = {};
    
    // Obtener lista de tablas
    const tablesResult = await sqliteService.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
    const tables = tablesResult.map((row: any) => row.name);
    
    // Exportar datos de cada tabla
    for (const table of tables) {
      const rows = await sqliteService.query(`SELECT * FROM "${table}";`);
      dbData[table] = rows;
    }
    
    // Estructura metadatos adicional (podríamos añadir versión, timestamp, etc.)
    const metadata = {
      exported_at: new Date().toISOString(),
      database_name: 'lukalibre',
      tables_count: tables.length,
      table_names: tables
    };
    
    // Datos completos para el LLM
    const fullData = {
      metadata,
      data: dbData
    };
    
    log.info('Base de datos exportada exitosamente a JSON');
    return fullData;
  } catch (error) {
    log.error('Error exportando base de datos a JSON:', error);
    throw new Error(`Error exportando base de datos: ${error}`);
  }
}

/**
 * Genera un reporte HTML usando el LLM y los datos de la base de datos
 */
export async function generateDashboardReport(): Promise<string> {
  try {
    log.info('Generando reporte de dashboard');
    
    // 1. Exportar toda la base de datos a JSON
    const dbData = await exportDatabaseToJson();
    
    // 2. Obtener el template de prompt para el dashboard
    const templates = await llmService.getPromptTemplates();
    // Verificar si los templates están en el formato esperado
    if (!templates || typeof templates !== 'object') {
      throw new Error('El formato de los templates no es válido');
    }
    
    // Manejar la estructura { default: { ... } } si es necesario
    const templateKey = 'dashboard_html_report_cl';
    let templateContent: string;
    
    if ('default' in templates && typeof templates.default === 'object') {
      // Si viene en formato { default: { key1: value1, key2: value2 } }
      const defaultTemplates = templates.default as Record<string, string>;
      templateContent = defaultTemplates[templateKey];
      // Añadir instrucción para respuesta en HTML crudo
      templateContent = templateContent.trim() + '\n\nDevuelve únicamente el HTML crudo, sin etiquetas de bloque de código ni explicaciones, para poder pintarlo directamente en el navegador.';
    } else {
      // Si viene en formato { key1: value1, key2: value2 }
      templateContent = (templates as Record<string, string>)[templateKey];
      // Añadir instrucción para respuesta en HTML crudo
      templateContent = templateContent.trim() + '\n\nDevuelve únicamente el HTML crudo, sin etiquetas de bloque de código ni explicaciones, para poder pintarlo directamente en el navegador.';
    }
    
    if (!templateContent) {
      throw new Error('No se encontró el template para el reporte de dashboard');
    }
    
    // 3. Reemplazar el marcador {{user_json}} con los datos reales
    const userJson = JSON.stringify(dbData, null, 2);
    let prompt = templateContent;
    prompt = prompt.replace('{{user_json}}', userJson);
    
    // 4. Preparar el FormData para enviar al LLM
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('step', 'dashboard_report');
    
    // 5. Llamar al LLM para generar el HTML
    // Llama a la función vía LLMProxyJs, ya que callLLMService no está exportada
    const apiKey = localStorage.getItem('openai_api_key') || '';
    const LLMProxyJs = (await import('./llmProxyJs')).default;
    const localProxy = new LLMProxyJs(apiKey);
    const response = await localProxy.proxyWithFile(formData);
    
    // 6. Devolver el HTML generado
    if (!response.llm_output) {
      throw new Error('No se recibió respuesta del LLM');
    }
    
    log.info('Reporte de dashboard generado correctamente');
    return response.llm_output;
  } catch (error) {
    log.error('Error generando reporte de dashboard:', error);
    throw new Error(`Error generando reporte: ${error}`);
  }
}
