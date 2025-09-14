// LLMProxyJs: Simplified LangChain.js proxy for browser usage
// Uses user's API key (in memory or localStorage)
// Implements rate limiting using SQLite database in browser

import databaseService from './databaseService';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface LLMProxyRequest {
  content: string;
  schemas?: string[];
  step: string;
  schema_name?: string;
  extra?: Record<string, any>;
}

export interface LLMProxyResponse {
  llm_output: string;
}

const DEFAULT_LIMITS = {
  per_minute: 5,
  per_hour: 30,
  per_day: 100,
  per_week: 400,
  per_month: 1000,
};

const TIME_WINDOWS = {
  per_minute: 60 * 1000,
  per_hour: 60 * 60 * 1000,
  per_day: 24 * 60 * 60 * 1000,
  per_week: 7 * 24 * 60 * 60 * 1000,
  per_month: 30 * 24 * 60 * 60 * 1000,
};

export class LLMProxyJs {
  private llm: ChatOpenAI | null = null;
  private userId: string = 'local';
  private limits = DEFAULT_LIMITS;
  private initialized = false;

  constructor(apiKey: string | null, userId: string = 'local') {
    this.userId = userId;
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  setApiKey(apiKey: string) {
    const model = (import.meta.env.VITE_OPENAI_MODEL as string) || 'gpt-3.5-turbo';
    this.llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: 0.1,
      maxTokens: 2048,
    });
  }

  private async ensureTableExists(): Promise<void> {
    if (this.initialized) return;

    try {
      const checkTable = await databaseService.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_request_logs'",
      );

      if (!checkTable || checkTable.length === 0) {
        console.log('Creating llm_request_logs table...');
        await databaseService.execMultiple(`
          CREATE TABLE IF NOT EXISTS llm_request_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_llm_logs_user_date ON llm_request_logs(user_id, created_at);
        `);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Error creating llm_request_logs table:', error);
      throw new Error('Failed to initialize logs system for local proxy');
    }
  }

  async checkLimits(): Promise<{ key: string; limit: number } | null> {
    await this.ensureTableExists();

    const now = new Date().getTime();
    const windows = Object.entries(TIME_WINDOWS);

    for (const [key, ms] of windows) {
      const since = new Date(now - (ms as number)).toISOString();
      const sql = `SELECT COUNT(*) as count FROM llm_request_logs WHERE user_id = ? AND created_at >= ?`;
      const res = await databaseService.query(sql, [this.userId, since]);
      const count = res[0]?.count || 0;

      if (count >= this.limits[key as keyof typeof DEFAULT_LIMITS]) {
        return { key, limit: this.limits[key as keyof typeof DEFAULT_LIMITS] };
      }
    }
    return null;
  }

  async logRequest(): Promise<void> {
    await this.ensureTableExists();
    const sql = `INSERT INTO llm_request_logs (user_id, created_at) VALUES (?, ?)`;
    await databaseService.query(sql, [this.userId, new Date().toISOString()]);
  }

  async processJsonRequest(request: LLMProxyRequest): Promise<string> {
    if (!this.llm) {
      throw new Error('OpenAI API key not configured');
    }

    let messages = [];

    if (request.step === 'identify_schema') {
      const schemasStr = request.schemas ? `\nOpciones: ${request.schemas.join(', ')}` : '';
      const systemPrompt =
        'Eres un asistente experto en clasificación de documentos. ' +
        'Dado el siguiente contenido y la lista de esquemas, responde solo con el nombre del esquema más adecuado.' +
        schemasStr;

      messages = [new SystemMessage(systemPrompt), new HumanMessage(request.content)];
    } else if (request.step === 'generate_sql_json') {
      const systemPrompt =
        'Eres un experto en extracción de datos. Dado el siguiente contenido, genera:\n' +
        '- Los comandos SQL INSERT para poblar todas las tablas relevantes del esquema en SQLite.\n' +
        '- El JSON correspondiente siguiendo el schema.\n' +
        "Responde en formato JSON así: {'sql_inserts': '...', 'json_data': {...}}";

      messages = [new SystemMessage(systemPrompt), new HumanMessage(request.content)];
    } else {
      messages = [new HumanMessage(request.content)];
    }

    const response = await this.llm.invoke(messages);
    return response.content as string;
  }

  async processMultipartRequest(prompt: string, files: File[]): Promise<string> {
    if (!this.llm) {
      throw new Error('OpenAI API key not configured');
    }

    let finalPrompt = prompt;

    // For files, append basic info to prompt (simplified handling)
    if (files && files.length > 0) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          // For images, we'd need to handle them specially
          // For now, just add file info to prompt
          finalPrompt += `\n\n[Archivo de imagen adjunto: ${file.name}, tamaño: ${(file.size / 1024).toFixed(2)} KB]`;
        } else {
          finalPrompt += `\n\n[Archivo adjunto: ${file.name}, tipo: ${file.type}, tamaño: ${(file.size / 1024).toFixed(2)} KB]`;
        }
      }
    }

    const message = new HumanMessage(finalPrompt);
    const response = await this.llm.invoke([message]);
    return response.content as string;
  }

  async proxy(request: LLMProxyRequest): Promise<LLMProxyResponse> {
    try {
      await this.ensureTableExists();

      // Rate limit check
      const limit = await this.checkLimits();
      if (limit) {
        throw new Error(`Rate limit exceeded (${limit.key}: ${limit.limit})`);
      }
      await this.logRequest();

      // Process request
      const llm_output = await this.processJsonRequest(request);
      return { llm_output };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error in local proxy: ${error}`);
    }
  }

  async proxyWithFile(formData: FormData): Promise<LLMProxyResponse> {
    try {
      await this.ensureTableExists();

      // Rate limit check
      const limit = await this.checkLimits();
      if (limit) {
        throw new Error(`Rate limit exceeded (${limit.key}: ${limit.limit})`);
      }
      await this.logRequest();

      // Extract data from FormData
      const prompt = formData.get('prompt') as string;
      const files = formData.getAll('files') as File[];

      if (!prompt) {
        throw new Error('Prompt is required');
      }

      // Process request
      const llm_output = await this.processMultipartRequest(prompt, files);
      return { llm_output };
    } catch (error) {
      console.error('Error in proxyWithFile:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error processing file: ${error}`);
    }
  }
}

export default LLMProxyJs;
