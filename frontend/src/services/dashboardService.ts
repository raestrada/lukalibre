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
    const tablesResult = await sqliteService.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
    );
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
      table_names: tables,
    };

    // Datos completos para el LLM
    const fullData = {
      metadata,
      data: dbData,
    };

    log.info('Base de datos exportada exitosamente a JSON');
    return fullData;
  } catch (error) {
    log.error('Error exportando base de datos a JSON:', error);
    throw new Error(`Error exportando base de datos: ${error}`);
  }
}

// Eliminada la verificación del frontend para dar prioridad a la inteligencia del LLM

/**
 * Genera un informe de balance financiero utilizando el LLM
 */
export async function generateFinancialBalance(): Promise<any> {
  try {
    log.info('Generando balance financiero');

    // 1. Exportar toda la base de datos a JSON
    const dbData = await exportDatabaseToJson();

    // 2. Obtener el template de prompt para el balance desde archivos Markdown
    const templates = await llmService.getPromptTemplates();
    if (!templates.default) {
      throw new Error('El formato de los templates no es válido');
    }

    // Usar el template específico para el balance financiero
    const templateKey = 'dashboard_balance_report_cl';
    let templateContent = templates.default[templateKey];

    if (!templateContent) {
      throw new Error(
        `No se encontró el template '${templateKey}' para el balance. Verifica que exista el archivo correspondiente en la carpeta de prompts.`,
      );
    }

    // Reemplazar el marcador {{user_json}} con los datos reales
    const userJson = JSON.stringify(dbData, null, 2);
    let prompt = templateContent;
    prompt = prompt.replace('{{user_json}}', userJson);

    // Añadir instrucciones específicas de formato al final del prompt
    prompt +=
      '\n\nIMPORTANTE: Tu respuesta debe contener ÚNICAMENTE el objeto JSON, sin texto adicional, sin bloques de código markdown (```) y sin explicaciones.';

    // 4. Preparar el FormData para enviar al LLM
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('step', 'financial_balance');

    // 5. Llamar al LLM usando el servicio unificado (que determina automáticamente si usar el proxy local o el backend)
    const response = await llmService.callLLMService(formData);

    // 6. Parsear el JSON de respuesta
    if (!response.llm_output) {
      throw new Error('No se recibió respuesta del LLM');
    }

    try {
      // Limpiar la respuesta de posibles bloques de código markdown
      const cleanedResponse = response.llm_output
        .replace(/^```(?:json)?\s*([\s\S]*?)```$/m, '$1')
        .trim();

      // Intentar parsear el JSON de respuesta limpia
      const balanceData = JSON.parse(cleanedResponse);
      log.info('Balance financiero generado correctamente');
      return balanceData;
    } catch (error) {
      // Si la respuesta limpia no es un JSON válido, intentar extraer el JSON de la respuesta
      const jsonMatch = response.llm_output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const balanceData = JSON.parse(jsonMatch[0]);
          log.info('Balance financiero generado correctamente');
          return balanceData;
        } catch (innerError) {
          log.error('Error al parsear la respuesta JSON extraída del LLM:', innerError);
          log.error('Respuesta recibida:', response.llm_output);
          throw new Error('La respuesta del LLM no contiene un JSON válido');
        }
      } else {
        log.error('Error al parsear la respuesta JSON del LLM: No se encontró JSON');
        log.error('Respuesta recibida:', response.llm_output);
        throw new Error('La respuesta del LLM no contiene un JSON válido');
      }
    }
  } catch (error) {
    log.error('Error generando balance financiero:', error);
    throw new Error(`Error generando balance: ${error}`);
  }
}

/**
 * Genera alertas financieras basadas en los datos del usuario
 */
export async function generateFinancialAlerts(): Promise<any> {
  try {
    log.info('Generando alertas financieras');

    // 1. Exportar toda la base de datos a JSON
    const dbData = await exportDatabaseToJson();

    // 2. Obtener el template de prompt para alertas desde archivos Markdown
    const templates = await llmService.getPromptTemplates();
    if (!templates.default) {
      throw new Error('El formato de los templates no es válido');
    }

    // Usar el template específico para alertas
    const templateKey = 'alert_cl';
    let templateContent = templates.default[templateKey];

    if (!templateContent) {
      throw new Error(
        `No se encontró el template '${templateKey}' para alertas. Verifica que exista el archivo correspondiente en la carpeta de prompts.`,
      );
    }

    // 3. Reemplazar el marcador user_json con los datos completos de la BD
    const userJson = JSON.stringify(dbData, null, 2);
    let prompt = templateContent;
    prompt = prompt.replace('{{user_json}}', userJson);

    // 4. Preparar el FormData para enviar al LLM
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('step', 'financial_alerts');

    // 5. Llamar al LLM usando el servicio unificado
    const response = await llmService.callLLMService(formData);

    // 6. Parsear el JSON de respuesta
    if (!response.llm_output) {
      throw new Error('No se recibió respuesta del LLM');
    }

    try {
      // Limpiar la respuesta de posibles bloques de código markdown
      const cleanedResponse = response.llm_output
        .replace(/^```(?:json)?\s*([\s\S]*?)```$/m, '$1')
        .trim();

      // Intentar parsear el JSON de respuesta limpia
      const alertsData = JSON.parse(cleanedResponse);
      log.info('Alertas financieras generadas correctamente');
      return alertsData;
    } catch (error) {
      // Si la respuesta limpia no es un JSON válido, intentar extraer el JSON de la respuesta
      const jsonMatch = response.llm_output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const alertsData = JSON.parse(jsonMatch[0]);
          log.info('Alertas financieras generadas correctamente');
          return alertsData;
        } catch (innerError) {
          log.error('Error al parsear la respuesta JSON extraída del LLM:', innerError);
          log.error('Respuesta recibida:', response.llm_output);
          throw new Error('La respuesta del LLM no contiene un JSON válido');
        }
      } else {
        log.error('Error al parsear la respuesta JSON del LLM: No se encontró JSON');
        log.error('Respuesta recibida:', response.llm_output);
        throw new Error('La respuesta del LLM no contiene un JSON válido');
      }
    }
  } catch (error) {
    log.error('Error generando alertas financieras:', error);
    throw new Error(`Error generando alertas: ${error}`);
  }
}

/**
 * Genera recomendaciones financieras personalizadas basadas en los datos del usuario
 */
export async function generateFinancialRecommendations(): Promise<any> {
  try {
    log.info('Generando recomendaciones financieras');

    // 1. Exportar toda la base de datos a JSON
    const dbData = await exportDatabaseToJson();

    // 2. Obtener el template de prompt para recomendaciones desde archivos Markdown
    const templates = await llmService.getPromptTemplates();
    if (!templates.default) {
      throw new Error('El formato de los templates no es válido');
    }

    // Usar el template específico para recomendaciones
    const templateKey = 'recommendation_cl';
    let templateContent = templates.default[templateKey];

    if (!templateContent) {
      throw new Error(
        `No se encontró el template '${templateKey}' para recomendaciones. Verifica que exista el archivo correspondiente en la carpeta de prompts.`,
      );
    }

    // 3. Reemplazar el marcador user_json con los datos completos de la BD
    const userJson = JSON.stringify(dbData, null, 2);
    let prompt = templateContent;
    prompt = prompt.replace('{{user_json}}', userJson);

    // 5. Añadir instrucciones específicas para formato JSON
    prompt +=
      '\n\nIMPORTANTE: Por favor estructura tu respuesta en formato JSON con el siguiente formato:\n\n' +
      '{\n  "recomendaciones": [\n    {\n      "titulo": "string",\n      "descripcion": "string",\n      "prioridad": "alta | media | baja",\n      "impacto": "string",\n      "accionable": "boolean"\n    }\n  ],\n  "resumen": "string con evaluación general",\n  "puntaje_salud_financiera": número del 1 al 10\n}';

    prompt +=
      '\n\nLa respuesta debe contener ÚNICAMENTE el objeto JSON, sin texto adicional, sin bloques de código markdown y sin explicaciones.';

    // 6. Preparar el FormData para enviar al LLM
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('step', 'financial_recommendations');

    // 7. Llamar al LLM usando el servicio unificado
    const response = await llmService.callLLMService(formData);

    // 8. Parsear el JSON de respuesta
    if (!response.llm_output) {
      throw new Error('No se recibió respuesta del LLM');
    }

    try {
      // Limpiar la respuesta de posibles bloques de código markdown
      const cleanedResponse = response.llm_output
        .replace(/^```(?:json)?\s*([\s\S]*?)```$/m, '$1')
        .trim();

      // Intentar parsear el JSON de respuesta limpia
      const recommendationsData = JSON.parse(cleanedResponse);
      log.info('Recomendaciones financieras generadas correctamente');
      return recommendationsData;
    } catch (error) {
      // Si la respuesta limpia no es un JSON válido, intentar extraer el JSON de la respuesta
      const jsonMatch = response.llm_output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const recommendationsData = JSON.parse(jsonMatch[0]);
          log.info('Recomendaciones financieras generadas correctamente');
          return recommendationsData;
        } catch (innerError) {
          log.error('Error al parsear la respuesta JSON extraída del LLM:', innerError);
          log.error('Respuesta recibida:', response.llm_output);
          throw new Error('La respuesta del LLM no contiene un JSON válido');
        }
      } else {
        log.error('Error al parsear la respuesta JSON del LLM: No se encontró JSON');
        log.error('Respuesta recibida:', response.llm_output);
        throw new Error('La respuesta del LLM no contiene un JSON válido');
      }
    }
  } catch (error) {
    log.error('Error generando recomendaciones financieras:', error);
    throw new Error(`Error generando recomendaciones: ${error}`);
  }
}

/**
 * Genera datos para el reporte financiero usando el LLM y los datos de la base de datos
 */
export async function generateDashboardReport(): Promise<any> {
  try {
    log.info('Generando reporte de dashboard');

    // 1. Exportar toda la base de datos a JSON
    const dbData = await exportDatabaseToJson();

    // 2. Obtener el template de prompt para el dashboard desde archivos Markdown
    const templates = await llmService.getPromptTemplates();
    if (!templates.default) {
      throw new Error('El formato de los templates no es válido');
    }

    // Usar el template HTML para el reporte del dashboard
    const templateKey = 'dashboard_html_report_cl';
    let templateContent = templates.default[templateKey];

    if (!templateContent) {
      throw new Error(
        `No se encontró el template '${templateKey}' en templates. Verifica que exista el archivo correspondiente en la carpeta de prompts.`,
      );
    }

    // Añadir instrucción para respuesta en JSON crudo en lugar de HTML
    templateContent = templateContent.trim();
    // Reemplazar cualquier instrucción de devolver HTML
    templateContent = templateContent.replace(/Devuelve.*HTML.*crudo.*navegador\./g, '');

    // Añadir instrucción clara y específica para el LLM
    templateContent +=
      '\n\nIMPORTANTE SOBRE LOS DATOS:\n1. USA TU INTELIGENCIA para analizar si hay suficientes datos financieros para generar un reporte.\n2. Si NO HAY SUFICIENTES DATOS (transacciones vacías, sin información financiera relevante), devuelve exactamente este JSON:\n\n{\n  "resumen": {\n    "informacionAdicional": "No hay suficientes datos financieros para generar un reporte. Por favor, sube algún archivo de transacciones o agrega datos manualmente."\n  },\n  "metas": { "items": [] },\n  "alertas": { \n    "items": [\n      {\n        "tipo": "info",\n        "titulo": "Base de datos vacía",\n        "mensaje": "No se encontraron transacciones o cuentas significativas. Sube algún archivo de extracto bancario para comenzar."\n      }\n    ] \n  },\n  "categorias": { "gastosPrincipales": [], "gastosDeducibles": [] },\n  "consejos": { "items": [] }\n}\n\n3. Si HAY SUFICIENTES DATOS, devuelve el JSON completo con el análisis financiero según la estructura solicitada.\n4. RESPUESTA EN JSON PURO: Devuelve ÚNICAMENTE el objeto JSON, sin explicaciones, anotaciones ```json o comentarios adicionales.';

    // 3. Reemplazar el marcador {{user_json}} con los datos reales
    const userJson = JSON.stringify(dbData, null, 2);
    let prompt = templateContent;
    prompt = prompt.replace('{{user_json}}', userJson);

    // 4. Preparar el FormData para enviar al LLM
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('step', 'dashboard_report');

    // 5. Llamar al LLM usando el servicio unificado (que determina automáticamente si usar el proxy local o el backend)
    const response = await llmService.callLLMService(formData);

    // 6. Parsear el JSON de respuesta
    if (!response.llm_output) {
      throw new Error('No se recibió respuesta del LLM');
    }

    try {
      // Limpiar la respuesta de posibles bloques de código markdown
      const cleanedResponse = response.llm_output
        .replace(/^```(?:json)?\s*([\s\S]*?)```$/m, '$1')
        .trim();

      // Intentar parsear el JSON de respuesta limpia
      const reportData = JSON.parse(cleanedResponse);
      log.info('Reporte de dashboard generado correctamente');
      return reportData;
    } catch (error) {
      // Si la respuesta limpia no es un JSON válido, intentar extraer el JSON de la respuesta
      const jsonMatch = response.llm_output.match(/\{[\s\S]*\}/m);
      if (jsonMatch) {
        try {
          const reportData = JSON.parse(jsonMatch[0]);
          log.info('Reporte de dashboard generado correctamente');
          return reportData;
        } catch (innerError) {
          throw new Error('La respuesta del LLM no contiene un JSON válido');
        }
      } else {
        throw new Error('La respuesta del LLM no contiene un JSON válido');
      }
    }
  } catch (error) {
    log.error('Error generando reporte de dashboard:', error);
    throw new Error(`Error generando reporte: ${error}`);
  }
}
