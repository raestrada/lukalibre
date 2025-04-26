// LLMProxyJs: Proxy LLM en JS para uso directo desde el navegador
// Usa la API key del usuario (en memoria o localStorage)
// Implementa rate limit igual que el backend, usando la base SQLite del browser

import databaseService from './databaseService';
import OpenAI from 'openai';

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
  private initialized = false;

  constructor(apiKey: string | null, userId: string = 'local') {
    this.apiKey = apiKey;
    this.userId = userId;
  }
  
  // Método para inicializar la tabla de logs si no existe
  private async ensureTableExists(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Verificar si la tabla existe
      const checkTable = await databaseService.query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='llm_request_logs'"
      );
      
      // Si la tabla no existe, crearla
      if (!checkTable || checkTable.length === 0) {
        console.log('Creando tabla llm_request_logs...');
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
      console.error('Error al crear tabla llm_request_logs:', error);
      throw new Error('No se pudo inicializar el sistema de logs para el proxy local');
    }
  }

  setApiKey(key: string) {
    this.apiKey = key;
  }

  // --- Rate limit ---
  async checkLimits(): Promise<{key: string, limit: number} | null> {
    // Asegurar que la tabla existe
    await this.ensureTableExists();
    
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
    // Asegurar que la tabla existe
    await this.ensureTableExists();
    
    const sql = `INSERT INTO llm_request_logs (user_id, created_at) VALUES (?, ?)`;
    await databaseService.query(sql, [this.userId, new Date().toISOString()]);
  }

  // Método para obtener una instancia del cliente OpenAI
  private getOpenAIClient(): OpenAI {
    if (!this.apiKey) throw new Error('API key de OpenAI no configurada');
    
    return new OpenAI({
      apiKey: this.apiKey,
      dangerouslyAllowBrowser: true // Necesario para usar en el navegador
    });
  }

  async callOpenAI(messages: any[]): Promise<string> {
    if (!this.apiKey) throw new Error('API key de OpenAI no configurada');
    
    try {
      const openai = this.getOpenAIClient();
      
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 2048,
        temperature: 0.1,
      });
      
      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('Error en llamada a OpenAI:', error);
      throw new Error(error?.message || 'Error en llamada a OpenAI');
    }
  }

  // --- Métodos auxiliares para manejo de archivos ---
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  
  private async extractTextFromFile(file: File): Promise<string> {
    // Para archivos de texto, simplemente leemos el contenido
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // Para PDFs y otros formatos, enviamos un mensaje descriptivo
    return `[Contenido del archivo: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)]`;
  }
  
  // --- Proxy principal para solicitudes de texto ---
  async proxy(req: LLMProxyRequest): Promise<LLMProxyResponse> {
    try {
      // Asegurar que la tabla existe
      await this.ensureTableExists();
      
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
    } catch (error) {
      // Capturar y reenviar el error con un mensaje más descriptivo
      if (error instanceof Error) {
        if (error.message.includes('llm_request_logs')) {
          throw new Error(`Error en la base de datos local: ${error.message}`);
        }
        throw error;
      }
      throw new Error(`Error desconocido en el proxy local: ${error}`);
    }
  }
  
  // --- Proxy para manejar archivos con FormData (usa la biblioteca oficial de OpenAI) ---
  async proxyWithFile(formData: FormData): Promise<LLMProxyResponse> {
    try {
      // Asegurar que la tabla existe
      await this.ensureTableExists();
      
      // 1. Rate limit
      const limit = await this.checkLimits();
      if (limit) {
        throw new Error(`Límite de uso excedido (${limit.key}: ${limit.limit})`);
      }
      await this.logRequest();
      
      // 2. Extraer el prompt y el archivo del FormData
      const prompt = formData.get('prompt') as string;
      const file = formData.get('files') as File;
      
      if (!prompt) {
        throw new Error('El prompt es requerido');
      }
      
      if (!this.apiKey) {
        throw new Error('API key de OpenAI no configurada');
      }
      
      // 3. Crear una instancia del cliente OpenAI
      const openai = this.getOpenAIClient();
      
      // 4. Preparar el contenido del mensaje
      let messageContent: any[] = [];
      
      // Agregar el texto del prompt
      messageContent.push({
        type: 'text',
        text: prompt
      });
      
      // Si hay un archivo, hacer lo mismo que en Python
      if (file) {
        try {
          // Para imágenes, usar image_url directamente
          if (file.type.startsWith('image/')) {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            messageContent.push({
              type: 'image_url',
              image_url: { url: `data:${file.type};base64,${base64}` }
            });
          } 
          // Para audio, similar a imágenes (si aplica)
          else if (file.type.startsWith('audio/')) {
            const arrayBuffer = await file.arrayBuffer();
            const base64 = this.arrayBufferToBase64(arrayBuffer);
            messageContent.push({
              type: 'audio',  // Si la API lo soporta
              audio: { url: `data:${file.type};base64,${base64}` }
            });
          }
          // Para el resto de archivos: SUBIR A LA API DE ARCHIVOS DE OPENAI
          else {
            console.log('Subiendo archivo a OpenAI:', file.name, file.type);
            
            // Convertir File a FormData para la solicitud
            const formDataForUpload = new FormData();
            formDataForUpload.append('file', file);
            formDataForUpload.append('purpose', 'assistants');
            
            // Subir archivo a OpenAI y obtener file_id (como en Python)
            const uploadResponse = await fetch('https://api.openai.com/v1/files', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`
              },
              body: formDataForUpload
            });
            
            if (!uploadResponse.ok) {
              throw new Error(`Error al subir archivo: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }
            
            const uploadData = await uploadResponse.json();
            const fileId = uploadData.id;
            console.log('Archivo subido a OpenAI con éxito, ID:', fileId);
            
            // Añadir el file_id al mensaje EXACTAMENTE igual que en Python
            messageContent.push({
              type: 'file',
              file: { file_id: fileId }
            });
          }
        } catch (error) {
          console.error('Error procesando archivo para OpenAI:', error);
          throw new Error(`Error procesando archivo: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      console.log('Enviando mensaje a OpenAI (simplificado).');
      
      // 5. Enviar la solicitud a OpenAI usando la biblioteca oficial
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: messageContent }],
        max_tokens: 2048,
        temperature: 0.1,
      });
      
      const llm_output = response.choices[0]?.message?.content || '';
      console.log('Respuesta de OpenAI (primeros 100 caracteres):', llm_output.substring(0, 100));
      
      // 6. Devolver la respuesta exactamente igual que el backend
      return { llm_output };
    } catch (error) {
      console.error('Error en proxyWithFile:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Error desconocido al procesar archivo: ${error}`);
    }
  }

  buildMessages(req: LLMProxyRequest): any[] {
    // Usa el contenido tal cual viene del frontend
    // El frontend ya obtiene los templates del backend y construye los prompts
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
