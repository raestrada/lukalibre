// LLM Service - Simplified LangChain implementation
// Handles both backend proxy and local LangChain.js usage

import httpService from './httpService';
import databaseService from './databaseService';
import LLMProxyJs from './llmProxyJs';

interface LLMResponse {
  llm_output: string;
}

// Check if user should use local proxy vs backend
function shouldUseLocalProxy(): boolean {
  const hasApiKey = !!localStorage.getItem('openai_api_key');

  const planData = localStorage.getItem('user_plan');
  let hasPlan = false;

  try {
    if (planData) {
      const plan = JSON.parse(planData);
      hasPlan =
        plan?.is_active && (plan.credits > 0 || (plan.is_developer && plan.dev_plan_active));
    }
  } catch (e) {
    console.error('Error parsing plan data:', e);
  }

  // Use local proxy if has API key but no active plan
  return hasApiKey && !hasPlan;
}

// Unified LLM service call
export async function callLLMService(formData: FormData): Promise<LLMResponse> {
  const useLocalProxy = shouldUseLocalProxy();

  // Ensure step is set for local proxy
  if (!formData.has('step')) {
    const prompt = formData.get('prompt') as string;
    const step = prompt?.includes('schema_json') ? 'generate_sql_json' : 'identify_schema';
    formData.append('step', step);
  }

  console.log(`Using ${useLocalProxy ? 'local LangChain.js' : 'backend'} proxy`);

  if (useLocalProxy) {
    try {
      const apiKey = localStorage.getItem('openai_api_key') || '';
      const localProxy = new LLMProxyJs(apiKey);
      return await localProxy.proxyWithFile(formData);
    } catch (err: any) {
      console.error('Local proxy error:', err);
      throw new Error(`Error using your API key: ${err.message}`);
    }
  } else {
    try {
      const response = await httpService.post<LLMResponse>('/llm/proxy', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      return { llm_output: response.data.llm_output || '' };
    } catch (err: any) {
      if (err.response?.status === 429) {
        throw new Error('Rate limit exceeded, try again in a few seconds.');
      }
      throw err;
    }
  }
}

// Load prompt templates from local files
import identifySchemaPrompt from '../prompts/identify_schema.md?raw';
import extractDataPrompt from '../prompts/extract_data.md?raw';
import recommendationClPrompt from '../prompts/recommendation_cl.md?raw';
import dashboardHtmlReportClPrompt from '../prompts/dashboard_html_report_cl.md?raw';
import dashboardBalanceReportClPrompt from '../prompts/dashboard_balance_report_cl.md?raw';
import alertClPrompt from '../prompts/alert_cl.md?raw';

interface TemplatesResponse {
  default?: Record<string, string>;
  [key: string]: any;
}

const promptTemplates: Record<string, string> = {
  identify_schema: identifySchemaPrompt,
  extract_data: extractDataPrompt,
  recommendation_cl: recommendationClPrompt,
  dashboard_html_report_cl: dashboardHtmlReportClPrompt,
  dashboard_balance_report_cl: dashboardBalanceReportClPrompt,
  alert_cl: alertClPrompt,
};

export async function getPromptTemplates(): Promise<TemplatesResponse> {
  return { default: promptTemplates };
}

export async function identifySchema(file: File, availableSchemas: string[]): Promise<string> {
  const templates = await getPromptTemplates();
  if (!templates.default?.['identify_schema']) {
    throw new Error('identify_schema template not found');
  }

  let prompt = templates.default['identify_schema']
    .replace(/\{\{schemas\}\}/g, availableSchemas.join(', '))
    .replace(/\{\{content\}\}/g, 'in attached file');

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  formData.append('step', 'identify_schema');

  const response = await callLLMService(formData);
  return response.llm_output.trim();
}

export async function extractAndInsertData(
  file: File,
  schemaName: string,
  _schemaJson: any,
): Promise<void> {
  // Get table structure from database
  const tableNames = await databaseService.listTables();
  const tables: { name: string; columns: string[] }[] = [];

  for (const table of tableNames) {
    const columns = await databaseService.getTableColumns(table);
    tables.push({ name: table, columns });
  }

  const templates = await getPromptTemplates();
  if (!templates.default?.['extract_data']) {
    throw new Error('extract_data template not found');
  }

  let prompt = templates.default['extract_data'].replace(
    /\{\{tables\}\}|\{tables\}/g,
    JSON.stringify(tables),
  );

  const formData = new FormData();
  formData.append('prompt', prompt);
  formData.append('files', file);
  formData.append('step', 'generate_sql_json');
  formData.append('schema_name', schemaName);

  const response = await callLLMService(formData);
  let llmResp = response.llm_output;

  if (!llmResp) throw new Error('Empty LLM response');

  // Clean JSON response
  if (typeof llmResp === 'string') {
    llmResp = llmResp
      .trim()
      .replace(/^```json[\r\n]*/i, '')
      .replace(/^```[\r\n]*/i, '')
      .replace(/```$/i, '')
      .trim()
      .replace(/,([\s\t\r\n]*[}\]])/g, '$1');
  }

  // Parse response
  let parsed;
  try {
    parsed = typeof llmResp === 'string' ? JSON.parse(llmResp) : llmResp;
  } catch (err) {
    console.warn('Invalid JSON response, attempting to extract SQL:', llmResp);

    if (typeof llmResp === 'string' && llmResp.toLowerCase().includes('sorry')) {
      throw new Error(
        `LLM rejected request: ${llmResp.substring(0, 100)}...\n\n` +
          `This may occur due to model configuration or file content.`,
      );
    }

    // Extract SQL statements
    const sqlMatch = llmResp.match(/INSERT\s+INTO[\s\S]*?;/i);
    if (sqlMatch) {
      parsed = { sql_inserts: sqlMatch[0] };
    } else {
      const statements = llmResp
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.toUpperCase().includes('INSERT INTO'))
        .map((stmt) => stmt + ';');

      if (statements.length > 0) {
        parsed = { sql_inserts: statements.join(' ') };
      } else {
        throw new Error('No SQL statements found in response');
      }
    }
  }

  if (!parsed.sql_inserts) {
    throw new Error('No SQL statements found in LLM response');
  }

  // Clean and execute SQL
  const cleanSql = parsed.sql_inserts
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r?\n|\r/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('Executing SQL:', cleanSql);
  await databaseService.execMultiple(cleanSql);
}
