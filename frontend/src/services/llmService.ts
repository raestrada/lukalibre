import httpService from './httpService';
import databaseService from './databaseService';
import LLMProxyJs from './llmProxyJs';

// Interfaz para las respuestas de LLM genéricas
interface LLMResponse {
  llm_output: string;
}

// Función para verificar si el usuario tiene un plan activo o debe usar su propia API key
function shouldUseLocalProxy(): boolean {
  // Si el usuario tiene una API key personal en localStorage
  const hasApiKey = !!localStorage.getItem('openai_api_key');
  
  // Verificar si hay un plan activo desde localStorage
  const planData = localStorage.getItem('user_plan');
  let plan = null;
  try {
    if (planData) {
      plan = JSON.parse(planData);
    }
  } catch (e) {
    console.error('Error al parsear datos del plan:', e);
  }
  
  // Si tiene plan activo con créditos, usar el backend
  const hasPlan = plan && plan.is_active && (plan.credits > 0 || 
                 ((plan.developer || plan.is_developer) && plan.dev_plan_active));
  
  // Usar proxy local si tiene API key pero NO tiene plan
  return hasApiKey && !hasPlan;
}

// Función unificada para llamar al servicio LLM (local o backend)
export async function callLLMService(formData: FormData): Promise<LLMResponse> {
  const useLocalProxy = shouldUseLocalProxy();

  // Agregar el step para que el proxy local sepa qué tipo de prompt es
  if (!formData.has('step')) {
    // Intentar detectar el step basado en el contenido
    const prompt = formData.get('prompt') as string;
    if (prompt && prompt.includes('schema_json')) {
      formData.append('step', 'generate_sql_json');
    } else {
      formData.append('step', 'identify_schema');
    }
  }

  console.log(`Usando proxy ${useLocalProxy ? 'local' : 'backend'} para operación`);
  
  if (useLocalProxy) {
    try {
      const apiKey = localStorage.getItem('openai_api_key') || '';
      const localProxy = new LLMProxyJs(apiKey);
      return await localProxy.proxyWithFile(formData);
    } catch (err: any) {
      console.error('Error en proxy local:', err);
      throw new Error(`Error al usar tu API key: ${err.message}`);
    }
  } else {
    try {
      const resp = await httpService.post<LLMResponse>('/llm/proxy', formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
      });
      
      // Adaptar respuesta del backend al mismo formato
      return { llm_output: resp.data.llm_output || '' };
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        throw new Error('Quota excedida, intenta nuevamente en unos segundos.');
      }
      throw err;
    }
  }
}

// Importar los archivos de prompts
import identifySchemaPrompt from '../prompts/identify_schema.md?raw';
import extractDataPrompt from '../prompts/extract_data.md?raw';
import recommendationClPrompt from '../prompts/recommendation_cl.md?raw';
import dashboardHtmlReportClPrompt from '../prompts/dashboard_html_report_cl.md?raw';
import dashboardBalanceReportClPrompt from '../prompts/dashboard_balance_report_cl.md?raw';
import alertClPrompt from '../prompts/alert_cl.md?raw';

// Define interfaces para los posibles formatos de templates
interface TemplatesResponse {
  default?: Record<string, string>;
  [key: string]: any;
}

// Crear un mapa de todos los prompts disponibles
const promptTemplates: Record<string, string> = {
  'identify_schema': identifySchemaPrompt,
  'extract_data': extractDataPrompt,
  'recommendation_cl': recommendationClPrompt,
  'dashboard_html_report_cl': dashboardHtmlReportClPrompt,
  'dashboard_balance_report_cl': dashboardBalanceReportClPrompt,
  'alert_cl': alertClPrompt
};

export async function getPromptTemplates(): Promise<TemplatesResponse> {
  // En lugar de pedir al backend, devuelve directamente los prompts cargados desde archivos
  return {
    default: promptTemplates
  };
}

export async function identifySchema(file: File, availableSchemas: string[]): Promise<string> {
  // Construir prompt y formData igual para ambos flujos
  const templates = await getPromptTemplates();
  if (!templates.default || !templates.default['identify_schema']) {
    throw new Error('No se encontró el prompt "identify_schema" en los templates.');
  }
  
  let prompt = templates.default['identify_schema'];
  prompt = prompt
    .replace(/\{\{schemas\}\}/g, availableSchemas.join(', '))
    .replace(/\{\{content\}\}/g, 'en el archivo adjunto');
  
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  formData.append('step', 'identify_schema');
  formData.append('schema_name', '');
  
  // Usar la función unificada para llamar al servicio correcto
  const response = await callLLMService(formData);
  
  // Devolver el resultado limpio
  return (response.llm_output || '').trim();
}

export async function extractAndInsertData(file: File, schemaName: string, schemaJson: any): Promise<void> {
  // Obtener tablas y columnas (común para ambos flujos)
  const tableNames = await databaseService.listTables();
  const tables: { name: string, columns: string[] }[] = [];
  for (const table of tableNames) {
    const columns = await databaseService.getTableColumns(table);
    tables.push({ name: table, columns });
  }
  
  // Construir prompt y formData igual para ambos flujos
  const templates = await getPromptTemplates();
  if (!templates.default || !templates.default['extract_data']) {
    throw new Error('No se encontró el prompt "extract_data" en los templates.');
  }
  
  let prompt = templates.default['extract_data'];
  
  // Solo reemplazar {{tables}} como lo hacía el backend original
  // No usamos schema_json para ser consistentes con el funcionamiento original
  prompt = prompt.replace(/\{\{tables\}\}|\{tables\}/g, JSON.stringify(tables));
  
  console.log('PROMPT TEMPLATE USADO:', prompt);
  
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  formData.append('step', 'generate_sql_json');
  formData.append('schema_name', schemaName);
  
  // Usar la función unificada para llamar al servicio
  const response = await callLLMService(formData);
  let llmResp = response.llm_output;
  
  // Procesar la respuesta
  if (!llmResp) throw new Error('Respuesta vacía del LLM');
  
  // Limpiar bloque de código ```json ... ``` y saltos de línea extra
  if (typeof llmResp === 'string') {
    llmResp = llmResp.trim()
      .replace(/^```json[\r\n]*/i, '')
      .replace(/^```[\r\n]*/i, '')
      .replace(/```$/i, '')
      .trim()
      // Quita comas finales antes de } o ] (JSON inválido común)
      .replace(/,([\s\t\r\n]*[}\]])/g, '$1');
  }
  
  // Intentar parsear JSON (puede venir como string o como objeto)
  let parsed;
  try {
    parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp;
  } catch (err) {
    // Si la respuesta no es JSON, vamos a intentar generar una respuesta compatible
    console.warn('La respuesta no es JSON válido, intentando adaptar:', llmResp);
    
    if (typeof llmResp === 'string' && llmResp.toLowerCase().includes('sorry')) {
      throw new Error(`OpenAI rechazó la solicitud con: ${llmResp.substring(0, 100)}...\n\n` + 
                    `Esto puede ocurrir por la configuración del modelo o por el contenido del archivo.`);
    }
    
    // Intentar crear un objeto con sql_inserts para continuar
    try {
      // Usar la lógica original del backend que funcionaba correctamente
      const sqlMatch = llmResp.match(/INSERT\s+INTO[\s\S]*?;/i);
      if (sqlMatch) {
        const sqlStatement = sqlMatch[0];
        parsed = { sql_inserts: sqlStatement };
        console.log('SQL extraído de la respuesta:', sqlStatement);
      } else {
        // Si no encontramos con la expresión regular básica, intentamos el enfoque alternativo
        const statements = llmResp.split(';').map(stmt => stmt.trim()).filter(stmt => !!stmt);
        const sqlMatches = statements
          .filter(stmt => stmt.toUpperCase().includes('INSERT INTO'))
          .map(stmt => stmt + ';');
        
        if (sqlMatches.length > 0) {
          // Unir todos los comandos SQL encontrados con punto y coma
          const allSqlStatements = sqlMatches.join(' ');
          parsed = { sql_inserts: allSqlStatements };
          console.log(`Se encontraron ${sqlMatches.length} comandos SQL:`);
          sqlMatches.forEach((sql: string, i: number) => console.log(`SQL #${i+1}:`, sql));
          console.log('SQL combinados:', allSqlStatements);
        } else {
          throw new Error('No se encontraron comandos SQL en la respuesta');
        }
      }
    } catch (innerErr) {
      throw new Error('No se pudo parsear la respuesta del LLM: ' + (err instanceof Error ? err.message : err) + '\nRespuesta cruda: ' + llmResp);
    }
  }
  if (!parsed.sql_inserts) throw new Error('No se encontraron comandos SQL en la respuesta del LLM.');
  
  // Limpieza de caracteres invisibles y saltos de línea
  let cleanSql = parsed.sql_inserts
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  console.log('SQL limpio a ejecutar:', cleanSql);
  
  // Ejecutar los INSERTS en la base local - usado execMultiple para sentencias separadas por ;
  await databaseService.execMultiple(cleanSql);
}
