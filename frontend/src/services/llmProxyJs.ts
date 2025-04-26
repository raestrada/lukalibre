// LLMProxyJs: Proxy LLM en JS para uso directo desde el navegador
// Usa la API key del usuario (en memoria o localStorage)
// Implementa rate limit igual que el backend, usando la base SQLite del browser

import databaseService from './databaseService';

export interface LLMProxyRequest {
  content: string;
  schemas?: string[];
  step: string; // 'identify_schema' | 'generate_sql_json' | ...
  schema_name?: string;
  extra?: Record<string, any>;
}

export interface LLMProxyResponse {
  schema_name?: string;
  sql_inserts?: string;
  json_data?: Record<string, any>;
  llm_output?: string;
}

const DEFAULT_LIMITS = {
  per_minute: 5,
  per_hour: 30,
  per_day: 100,
  per_week: 400,
  per_month: 1000,
};

function nowUTC() {
  return new Date(new Date().toISOString());
}

const TIME_WINDOWS = {
  per_minute: 60 * 1000,
  per_hour: 60 * 60 * 1000,
  per_day: 24 * 60 * 60 * 1000,
  per_week: 7 * 24 * 60 * 60 * 1000,
  per_month: 30 * 24 * 60 * 60 * 1000,
};

export class LLMProxyJs {
  private apiKey: string | null = null;
  private userId: string = 'local';
  private limits = DEFAULT_LIMITS;

  constructor(apiKey: string | null, userId: string = 'local') {
    this.apiKey = apiKey;
    this.userId = userId;
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  // --- Rate limit ---
  async checkLimits(): Promise<{key: string, limit: number} | null> {
    const now = nowUTC().getTime();
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

  async logRequest() {
    const sql = `INSERT INTO llm_request_logs (user_id, created_at) VALUES (?, ?)`;
    await databaseService.query(sql, [this.userId, new Date().toISOString()]);
  }

  async callOpenAI(messages: any[]): Promise<string> {
    if (!this.apiKey) throw new Error('API key de OpenAI no configurada');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        max_tokens: 2048,
        temperature: 0.1,
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error en llamada a OpenAI');
    }
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  // --- Proxy principal ---
  async proxy(req: LLMProxyRequest): Promise<LLMProxyResponse> {
    // 1. Rate limit
    const limit = await this.checkLimits();
    if (limit) {
      throw new Error(`Límite de uso excedido (${limit.key}: ${limit.limit})`);
    }
    await this.logRequest();

    // 2. Construir mensajes para OpenAI
    const messages = this.buildMessages(req);
    const llm_output = await this.callOpenAI(messages);
    // 3. Responder igual que el backend
    return { ...req, llm_output };
  }

  buildMessages(req: LLMProxyRequest): any[] {
    // Adapta según tu prompt engineering real
    if (req.step === 'identify_schema') {
      return [
        { role: 'system', content: 'Identifica el esquema correspondiente.' },
        { role: 'user', content: req.content }
      ];
    } else if (req.step === 'generate_sql_json') {
      return [
        { role: 'system', content: `Genera SQL y JSON para el esquema: ${req.schema_name}` },
        { role: 'user', content: req.content }
      ];
    }
    // Default
    return [
      { role: 'user', content: req.content }
    ];
  }
}

export default LLMProxyJs;
