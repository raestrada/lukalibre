<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import type { User } from '../../services/authService';
  import databaseService from '../../services/databaseService';
  import Button from '../common/Button.svelte';
  import { createLogger } from '../../utils/logger';
  import SyncSettings from '../SyncSettings.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import LlmBar from './LlmBar.svelte';
  import DashboardReport from './DashboardReport.svelte';

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
  
  // Variables para la barra de progreso
  let progressPercentage = 0;
  let currentStage = 0;
  let currentStageMessage = '';
  
  // Definir las etapas del proceso
  const processingStages = [
    { id: 'upload', label: 'Subiendo archivo', percentage: 10 },
    { id: 'identify', label: 'Identificando tipo de documento', percentage: 30 },
    { id: 'extract', label: 'Extrayendo datos con IA', percentage: 70 },
    { id: 'insert', label: 'Insertando en base de datos', percentage: 90 },
    { id: 'complete', label: 'Proceso completado', percentage: 100 }
  ];
  
  // Función para actualizar el progreso
  function updateProgress(stageId: string) {
    const stageIndex = processingStages.findIndex(stage => stage.id === stageId);
    if (stageIndex >= 0) {
      currentStage = stageIndex;
      progressPercentage = processingStages[stageIndex].percentage;
      currentStageMessage = processingStages[stageIndex].label;
    }
  }

  async function handleLLMProxySubmit(e: Event) {
    e.preventDefault();
    llmError = null;
    llmSuccess = null;
    if (!llmFile) {
      llmError = 'Debes seleccionar un archivo.';
      return;
    }
    
    // Iniciar progreso
    llmLoading = true;
    progressPercentage = 0;
    currentStageMessage = '';
    
    try {
      // 1. Iniciar subida de archivo
      updateProgress('upload');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simular tiempo de procesamiento
      
      // 2. Obtener schemas disponibles e identificar el esquema
      updateProgress('identify');
      const schemas = await dataService.getSchemas();
      const schemaNames = schemas.map(s => s.name);
      const detectedSchema = await llmService.identifySchema(llmFile, schemaNames);
      
      // Match robusto ignorando mayúsculas, tildes y espacios
      function normalize(str: string): string {
        return str
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
          .replace(/\s+/g, ''); // quita espacios
      }
      
      const detectedNorm = normalize(detectedSchema);
      const schemaObj = schemas.find(s => normalize(s.name) === detectedNorm);
      if (!schemaObj) throw new Error('No se pudo identificar el esquema del documento.');
      
      // 3. Extraer datos con IA
      updateProgress('extract');
      
      // 4. Insertar en base de datos
      updateProgress('insert');
      await llmService.extractAndInsertData(llmFile, detectedSchema, schemaObj.schema);
      
      // 5. Completar proceso
      updateProgress('complete');
      await new Promise(resolve => setTimeout(resolve, 500)); // Mantener barra completa por un momento
      
      llmSuccess = `¡Documento procesado e insertado en la tabla '${detectedSchema}' exitosamente!`;
      llmFile = null;
    } catch (err: any) {
      if (import.meta.env && import.meta.env.DEV) {
        llmError = err.message || 'Error desconocido';
      } else {
        llmError = 'Ocurrió un error al procesar el archivo.';
      }
    } finally {
      llmLoading = false;
      // Resetear el progreso después de un breve retraso
      setTimeout(() => {
        progressPercentage = 0;
        currentStageMessage = '';
        currentStage = 0;
      }, 2000);
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
  <LlmBar />
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
        <input class="llm-bar-file" type="file" accept="image/*,.pdf" on:change={e => llmFile = (e.target as HTMLInputElement)?.files?.[0] ?? null} />
        <Button type="submit" variant="primary" size="md" disabled={llmLoading} loading={llmLoading} fullWidth={false}>
  {llmLoading ? 'Procesando...' : 'Enviar'}
</Button>
      </form>
      
      {#if llmLoading}
        <div class="progress-container">
          <div class="progress-bar" style="width: {progressPercentage}%"></div>
          <div class="progress-stage">{currentStageMessage}</div>
          <div class="progress-percentage">{progressPercentage}%</div>
        </div>
      {/if}
    </div>
    <DashboardReport />
    {#if llmSuccess}
      <StatusMessage
        type="success"
        message={llmSuccess}
        onClose={() => llmSuccess = null}
      />
    {/if}
    
    {#if llmError}
      <StatusMessage
        type="error"
        message={llmError}
        onClose={() => llmError = null}
      />
    {/if}
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
  
  .progress-container {
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
    position: relative;
    height: 24px;
    background-color: #f5f5f5;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
  }
  
  .progress-bar {
    height: 100%;
    background-color: #4caf50;
    border-radius: 4px;
    transition: width 0.4s ease;
    position: relative;
    overflow: hidden;
  }
  
  .progress-bar::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background-image: linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.2) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.2) 75%,
      transparent 75%,
      transparent
    );
    background-size: 50px 50px;
    animation: progress-animation 2s linear infinite;
    border-radius: 4px;
  }
  
  @keyframes progress-animation {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 50px 50px;
    }
  }
  
  .progress-stage {
    position: absolute;
    left: 10px;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    color: white;
    font-size: 0.85rem;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0,0,0,0.2);
    z-index: 2;
  }
  
  .progress-percentage {
    position: absolute;
    right: 10px;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
    color: #333;
    font-size: 0.85rem;
    font-weight: bold;
    z-index: 2;
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