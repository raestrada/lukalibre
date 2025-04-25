import httpService from './httpService';
import databaseService from './databaseService';

export async function getPromptTemplates(): Promise<Record<string, string>> {
  // Siempre pide los templates frescos del backend, sin cache
  const resp = await httpService.get('/prompts/templates');
  return resp.data as Record<string, string>;
}

export async function identifySchema(file: File, availableSchemas: string[]): Promise<string> {
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
  return (resp.data.llm_output || '').trim();
}

export async function extractAndInsertData(file: File, schemaName: string, schemaJson: any): Promise<void> {
  const templates = await getPromptTemplates();
  if (!templates['extract_data']) {
    throw new Error('No se encontró el prompt "extract_data" en los templates del backend.');
  }
  const prompt = templates['extract_data'];
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
  // Esperamos una respuesta tipo { json_data: {...}, sql_inserts: "..." }
  let llmResp = resp.data.llm_output;
  if (!llmResp) throw new Error('Respuesta vacía del LLM');
  // Limpiar bloque de código ```json ... ``` y saltos de línea extra
  if (typeof llmResp === 'string') {
    llmResp = llmResp.trim()
      .replace(/^```json[\r\n]*/i, '')
      .replace(/^```[\r\n]*/i, '')
      .replace(/```$/i, '')
      .trim()
      // Quita comas finales antes de } o ] (JSON inválido común)
      .replace(/,([ \t\r\n]*[}\]])/g, '$1');
  }
  // Intentar parsear JSON (puede venir como string o como objeto)
  let parsed;
  try {
    parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp;
  } catch (err) {
    throw new Error('No se pudo parsear la respuesta del LLM: ' + (err instanceof Error ? err.message : err) + '\nRespuesta cruda: ' + llmResp);
  }
  if (!parsed.sql_inserts) throw new Error('No se encontraron comandos SQL en la respuesta del LLM.');
  // Limpieza de caracteres invisibles y saltos de línea
  let cleanSql = parsed.sql_inserts
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  console.log('SQL limpio a ejecutar:', cleanSql);
  // Ejecutar los INSERTS en la base local
  await databaseService.exec(cleanSql);
}
