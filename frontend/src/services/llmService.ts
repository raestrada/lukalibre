import httpService from './httpService';
import databaseService from './databaseService';
import LLMProxyJs from './llmProxyJs';

// Función para verificar si el usuario tiene un plan activo o debe usar su propia API key
function shouldUseLocalProxy(): boolean {
  // Si el usuario tiene una API key personal en localStorage
  const hasApiKey = !!localStorage.getItem('openai_api_key');
  
  // Verificar si hay un plan activo (esto debería coincidir con la lógica de PlanStatus.svelte)
  // Obtener datos del plan desde localStorage (si existen)
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

// Función para obtener una instancia del proxy local con la API key del usuario
function getLocalProxy(): LLMProxyJs {
  const apiKey = localStorage.getItem('openai_api_key') || '';
  return new LLMProxyJs(apiKey);
}

export async function getPromptTemplates(): Promise<Record<string, string>> {
  // Siempre pide los templates frescos del backend, sin cache
  const resp = await httpService.get('/prompts/templates');
  return resp.data as Record<string, string>;
}

export async function identifySchema(file: File, availableSchemas: string[]): Promise<string> {
  // Verificar si debemos usar el proxy local o el backend
  const useLocalProxy = shouldUseLocalProxy();
  console.log('Usando proxy local para identifySchema:', useLocalProxy);
  
  if (useLocalProxy) {
    // Usar el proxy local con la API key del usuario
    try {
      const localProxy = getLocalProxy();
      
      // Construir un FormData exactamente igual que cuando se usa el backend
      const templates = await getPromptTemplates();
      if (!templates['identify_schema']) {
        throw new Error('No se encontró el prompt "identify_schema" en los templates del backend.');
      }
      let prompt = templates['identify_schema'];
      // Sustituye {{schemas}} y {{content}} igual que en el flujo original
      prompt = prompt
        .replace(/\{\{schemas\}\}/g, availableSchemas.join(', '))
        .replace(/\{\{content\}\}/g, 'en el archivo adjunto');
      
      // Construir FormData con el archivo completo, igual que con el backend
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('files', file);
      
      // Enviar la solicitud al proxy local, pero con el archivo completo
      // Ahora usando la biblioteca oficial de OpenAI
      const response = await localProxy.proxyWithFile(formData);
      
      // Devolver el resultado (nombre del esquema)
      return (response.llm_output || '').trim();
    } catch (err: any) {
      console.error('Error en proxy local:', err);
      throw new Error(`Error al usar tu API key: ${err.message}`);
    }
  } else {
    // Usar el backend como proxy (código original)
    const templates = await getPromptTemplates();
    if (!templates['identify_schema']) {
      throw new Error('No se encontró el prompt "identify_schema" en los templates del backend.');
    }
    let prompt = templates['identify_schema'];
    // Sustituye {{schemas}} y {{content}} si existen en el template
    prompt = prompt
      .replace(/\{\{schemas\}\}/g, availableSchemas.join(', '))
      .replace(/\{\{content\}\}/g, 'en el archivo adjunto');
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('files', file);
    let resp;
    try {
      resp = await httpService.post('/llm/proxy', formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
      });
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        throw new Error('Quota excedida, intenta nuevamente en unos segundos.');
      }
      throw err;
    }
    // LLM responde con el nombre del esquema (puede venir con saltos de línea, limpiar)
    const responseData = resp.data as { llm_output?: string };
    return (responseData.llm_output || '').trim();
  }
}

export async function extractAndInsertData(file: File, schemaName: string, schemaJson: any): Promise<void> {
  // Verificar si debemos usar el proxy local o el backend
  const useLocalProxy = shouldUseLocalProxy();
  console.log('Usando proxy local para extractAndInsertData:', useLocalProxy);
  
  // Obtener todas las tablas y columnas (necesario para ambos flujos)
  const tableNames = await databaseService.listTables();
  const tables: { name: string, columns: string[] }[] = [];
  for (const table of tableNames) {
    const columns = await databaseService.getTableColumns(table);
    tables.push({ name: table, columns });
  }
  
  // Variable para almacenar la respuesta del LLM
  let llmResp: any;
  
  if (useLocalProxy) {
    // Usar el proxy local con la API key del usuario
    try {
      const localProxy = getLocalProxy();
      
      // Construir un FormData exactamente igual que cuando se usa el backend
      const templates = await getPromptTemplates();
      if (!templates['extract_data']) {
        throw new Error('No se encontró el prompt "extract_data" en los templates del backend.');
      }
      let prompt = templates['extract_data'];
      // Reemplazar las variables en el prompt: tablas, content y schema_json
      prompt = prompt.replace(/\{\{tables\}\}|\{tables\}/g, JSON.stringify(tables))
                  .replace(/\{\{schema_json\}\}/g, JSON.stringify(schemaJson));
      console.log('PROMPT TEMPLATE USADO:', prompt);
      
      // Construir FormData con el archivo completo, igual que con el backend
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('files', file);
      
      // Enviar la solicitud al proxy local, pero con el archivo completo
      // Ahora usando la biblioteca oficial de OpenAI
      const response = await localProxy.proxyWithFile(formData);
      
      // Obtener la respuesta
      llmResp = response.llm_output;
    } catch (err: any) {
      console.error('Error en proxy local:', err);
      throw new Error(`Error al usar tu API key: ${err.message}`);
    }
  } else {
    // Usar el backend como proxy (código original)
    const templates = await getPromptTemplates();
    if (!templates['extract_data']) {
      throw new Error('No se encontró el prompt "extract_data" en los templates del backend.');
    }
    let prompt = templates['extract_data'];
    // Reemplazar {tables} o {{tables}} en el prompt
    prompt = prompt.replace(/\{\{tables\}\}|\{tables\}/g, JSON.stringify(tables));
    console.log('PROMPT TEMPLATE USADO:', prompt);
    const formData = new FormData();
    formData.append('prompt', prompt);
    formData.append('files', file);
    let resp;
    try {
      resp = await httpService.post('/llm/proxy', formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
      });
    } catch (err: any) {
      if (err.response && err.response.status === 429) {
        throw new Error('Quota excedida, intenta nuevamente en unos segundos.');
      }
      throw err;
    }
    // Obtener la respuesta
    const responseData = resp.data as { llm_output?: string };
    llmResp = responseData.llm_output;
  }
  
  // A partir de aquí, el procesamiento es común para ambos flujos
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
      // Buscar algo que parezca SQL
      const sqlMatch = llmResp.match(/INSERT\s+INTO[\s\S]*?;/i);
      if (sqlMatch) {
        const sqlStatement = sqlMatch[0];
        parsed = { sql_inserts: sqlStatement };
        console.log('SQL extraído de la respuesta:', sqlStatement);
      } else {
        throw new Error('No se encontraron comandos SQL en la respuesta');
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
