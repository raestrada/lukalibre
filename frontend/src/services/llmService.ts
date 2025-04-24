import httpService from './httpService';
import databaseService from './databaseService';

let promptTemplatesCache: Record<string, string> | null = null;

export async function getPromptTemplates(forceReload = false): Promise<Record<string, string>> {
  if (promptTemplatesCache && !forceReload) return promptTemplatesCache;
  const resp = await httpService.get('/prompts/templates');
  promptTemplatesCache = resp.data;
  return promptTemplatesCache;
}

export async function identifySchema(file: File, availableSchemas: string[]): Promise<string> {
  const templates = await getPromptTemplates();
  const prompt = templates['identify_schema'] || `¿A qué tipo de documento pertenece el archivo adjunto? Opciones: ${availableSchemas.join(', ')}.`;
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  const resp = await httpService.post('/llm/proxy', formData, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
  });
  // LLM responde con el nombre del esquema (puede venir con saltos de línea, limpiar)
  return (resp.data.llm_output || '').trim();
}

export async function extractAndInsertData(file: File, schemaName: string, schemaJson: any): Promise<void> {
  const templates = await getPromptTemplates();
  const prompt =
    templates['extract_data'] ||
    `Extrae todos los datos relevantes del archivo adjunto siguiendo el siguiente esquema: ${JSON.stringify(schemaJson)}. Devuelve la respuesta en formato JSON válido bajo la clave json_data y los comandos SQL INSERT necesarios para poblar todas las tablas relacionadas en SQLite bajo la clave sql_inserts. Ejemplo: {"json_data": {...}, "sql_inserts": "INSERT INTO ...;"}`;
  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  const resp = await httpService.post('/llm/proxy', formData, {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt')}` }
  });
  // Esperamos una respuesta tipo { json_data: {...}, sql_inserts: "..." }
  let llmResp = resp.data.llm_output;
  if (!llmResp) throw new Error('Respuesta vacía del LLM');
  // Intentar parsear JSON (puede venir como string o como objeto)
  let parsed;
  try {
    parsed = typeof llmResp === 'string' ? JSON.parse(llmResp.replace(/'/g, '"')) : llmResp;
  } catch (err) {
    throw new Error('No se pudo parsear la respuesta del LLM: ' + llmResp);
  }
  if (!parsed.sql_inserts) throw new Error('No se encontraron comandos SQL en la respuesta del LLM.');
  // Ejecutar los INSERTS en la base local
  await databaseService.executeSql(parsed.sql_inserts);
}
