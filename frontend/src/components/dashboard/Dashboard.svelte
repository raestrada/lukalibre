<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import type { User } from '../../services/authService';
  import databaseService from '../../services/databaseService';
  import googleDriveService from '../../services/googleDriveService';
  import { createLogger } from '../../utils/logger';
  import SyncSettings from '../SyncSettings.svelte';

  const log = createLogger('Dashboard');
  
  let user: User | null = null;
  let loading = true;
  let dbInitialized = false;
  let dbError = '';

  // LLM Proxy
  import * as llmService from '../../services/llmService';
  import dataService from '../../services/dataService';

  let llmFile: File | null = null;
  let llmLoading = false;
  let llmSuccess: string | null = null;
  let llmError: string | null = null;

  async function handleLLMProxySubmit(e: Event) {
    e.preventDefault();
    llmError = null;
    llmSuccess = null;
    if (!llmFile) {
      llmError = 'Debes seleccionar un archivo.';
      return;
    }
    llmLoading = true;
    try {
      // 1. Obtener schemas disponibles (puede ser desde dataService o API)
      const schemas = await dataService.getSchemas();
      const schemaNames = schemas.map(s => s.name);
      // 2. Identificar el esquema
      const detectedSchema = await llmService.identifySchema(llmFile, schemaNames);
      const schemaObj = schemas.find(s => s.name === detectedSchema);
      if (!schemaObj) throw new Error('No se pudo identificar el esquema del documento.');
      // 3. Extraer y poblar datos
      await llmService.extractAndInsertData(llmFile, detectedSchema, schemaObj.schema);
      llmSuccess = `¡Documento procesado e insertado en la tabla '${detectedSchema}' exitosamente!`;
      llmFile = null;
    } catch (err) {
      llmError = err.message || 'Error desconocido';
    } finally {
      llmLoading = false;
    }
  }

  onMount(async () => {
    const state = authStore.getState();
    if (state.user) {
      user = state.user;
    }
    
    // Inicializar la base de datos
    try {
      log.info('Inicializando base de datos');
      await databaseService.initialize();
      dbInitialized = true;
      log.info('Base de datos inicializada correctamente');
    } catch (error) {
      log.error('Error inicializando base de datos:', error);
      dbError = 'Error al inicializar la base de datos. Por favor recarga la página.';
    } finally {
      loading = false;
    }
  });
  
  onDestroy(() => {
    // Asegurar que se cierre la conexión a la base de datos
    if (dbInitialized) {
      databaseService.close();
    }
  });
</script>

<div class="dashboard">
  <div class="sync-bar"><SyncSettings /></div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Cargando tus datos...</p>
    </div>
  {:else if dbError}
    <div class="error">
      <p>{dbError}</p>
      <button on:click={() => window.location.reload()}>Reintentar</button>
    </div>
  {:else if user}
    <!-- LLM Proxy Upload Barra -->
    <div class="llm-bar">
      <form class="llm-bar-flex" on:submit={handleLLMProxySubmit}>
        <span class="llm-bar-label">Subir documento o imagen para procesar con IA:</span>
        <input class="llm-bar-file" type="file" accept="image/*,.pdf" on:change={e => llmFile = e.target.files[0]} />
        <button class="llm-bar-btn" type="submit" disabled={llmLoading}>
          {llmLoading ? 'Procesando...' : 'Enviar'}
        </button>
        {#if llmError}
          <span class="llm-bar-alert error">{llmError}</span>
        {/if}
        {#if llmSuccess}
          <span class="llm-bar-alert success">{llmSuccess}</span>
        {/if}
      </form>
    </div>
    {#if !dbInitialized}
      <div class="dashboard-empty">
        <div class="empty-message">
          <p>El dashboard está actualmente vacío.</p>
          <p>Próximamente añadiremos funcionalidades y herramientas para mejorar tu experiencia.</p>
        </div>
      </div>
    {/if}
  {:else}
    <div class="error">
      <p>No se pudo cargar la información del usuario. Por favor inicia sesión nuevamente.</p>
    </div>
  {/if}
</div>

<style lang="css">
  .llm-bar {
    background: rgba(255,255,255,0.85);
    color: var(--text-primary, #212529);
    padding: 0.25rem 0.75rem;
    border-bottom: 1px solid #e2e6ea;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 1.5rem;
  }
  .llm-bar-flex {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 48px;
  }
  .llm-bar-label {
    font-weight: 500;
    color: #2d3436;
    margin-right: 0.5rem;
    white-space: nowrap;
  }
  .llm-bar-file {
    flex: 1 1 200px;
    min-width: 0;
    border: 1px solid #dfe4ea;
    border-radius: 6px;
    background: #f1f2f6;
    padding: 0.4rem 0.5rem;
    font-size: 1rem;
    margin-right: 0.5rem;
  }
  .llm-bar-btn {
    background: #3a6351;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 0.5rem 1.2rem;
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
    margin-right: 0.5rem;
  }
  .llm-bar-btn:disabled {
    background: #b2bec3;
    cursor: not-allowed;
  }
  .llm-bar-btn:not(:disabled):hover {
    background: #26543c;
  }
  .llm-bar-alert {
    margin-left: 0.5rem;
    padding: 0.35rem 0.8rem;
    border-radius: 6px;
    font-size: 0.98rem;
    font-weight: 500;
    min-width: 120px;
    text-align: center;
    display: inline-block;
  }
  .llm-bar-alert.error {
    background: #ffeded;
    color: #d63031;
    border: 1px solid #fab1a0;
  }
  .llm-bar-alert.success {
    background: #eafaf1;
    color: #218c5a;
    border: 1px solid #55efc4;
  }

  .llm-upload-bg {
    min-height: 60vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    background: #f5f6fa;
    padding-top: 3rem;
  }
  .llm-upload-card {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(44, 62, 80, 0.08);
    padding: 2.5rem 2rem 2rem 2rem;
    max-width: 400px;
    width: 100%;
    text-align: center;
    margin: 0 auto;
  }
  .llm-upload-card h2 {
    color: #222f3e;
    margin-bottom: 1.5rem;
    font-size: 1.5rem;
    font-weight: 700;
  }
  .llm-label {
    display: block;
    color: #576574;
    font-weight: 500;
    margin-bottom: 1.5rem;
    text-align: left;
  }
  .llm-file {
    margin-top: 0.5rem;
    width: 100%;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #dfe4ea;
    background: #f1f2f6;
    font-size: 1rem;
  }
  .llm-btn {
    width: 100%;
    padding: 0.75rem 0;
    border: none;
    border-radius: 8px;
    background: #3a6351;
    color: #fff;
    font-size: 1.1rem;
    font-weight: 700;
    cursor: pointer;
    margin-top: 0.5rem;
    transition: background 0.2s;
  }
  .llm-btn:disabled {
    background: #b2bec3;
    cursor: not-allowed;
  }
  .llm-btn:not(:disabled):hover {
    background: #26543c;
  }
  .llm-alert {
    margin-top: 1.2rem;
    padding: 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
  }
  .llm-alert.error {
    background: #ffeded;
    color: #d63031;
    border: 1px solid #fab1a0;
  }
  .llm-alert.success {
    background: #eafaf1;
    color: #218c5a;
    border: 1px solid #55efc4;
  }

  .dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0;
  }
  
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    margin-top: 2rem;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid var(--primary-color, #4a69bd);
    width: 40px;
    height: 40px;
    margin-bottom: 1rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .welcome {
  background-color: var(--primary);
  color: var(--text-inverse);

    background-color: var(--primary, #3A6351);
    color: #fff;
    padding: var(--space-lg);
    border-radius: var(--radius-lg);
    margin-top: var(--space-lg);
    margin-bottom: var(--space-lg);
    border-left: 6px solid var(--success, #3A6351);
    box-shadow: 0 2px 8px var(--shadow);
  }
  .welcome h2, .welcome p {
    color: #fff;
  }
  
  .dashboard-empty {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: var(--space-xl);
    background-color: var(--secondary, #6c757d);
    border-radius: var(--radius-lg);
    box-shadow: 0 2px 8px var(--shadow);
  }
  .empty-message {
    text-align: center;
    max-width: 500px;
    color: #fff;
  }
  .empty-message p {
    margin-bottom: 1rem;
    color: #fff;
  }
  
  .empty-message {
    text-align: center;
    max-width: 500px;
    color: #666;
  }
  
  .empty-message p {
    margin-bottom: 1rem;
  }
  
  .error {
    color: #d63031;
    background-color: #ffeded;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  button {
    cursor: pointer;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    border: 1px solid #ddd;
    background-color: #f8f8f8;
    transition: background-color 0.2s;
  }
  
  button:hover {
    background-color: #eaeaea;
  }
</style> 