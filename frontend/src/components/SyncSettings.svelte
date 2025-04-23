<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { settingsStore } from '../stores/settingsStore';
  import databaseService from '../services/databaseService';
  import googleDriveService from '../services/googleDriveService';
  import { createLogger } from '../utils/logger';
  
  const log = createLogger('SyncSettings');
  
  // Estado local
  let syncEnabled: boolean = false;
  let syncInterval: number = 30;
  let lastSyncDate: string | null = null;
  let isAuthenticated: boolean = false;
  let syncing: boolean = false;
  let exportingDb: boolean = false;
  let importingDb: boolean = false;
  let importFile: File | null = null;
  let showDetails: boolean = false;
  
  // Para formatear la fecha
  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'Nunca';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch (e) {
      return 'Fecha inválida';
    }
  }
  
  // Cargar la configuración
  let unsubscribe: Function;
  onMount(async () => {
    // Suscribirse a cambios en la configuración
    unsubscribe = settingsStore.subscribe(settings => {
      syncEnabled = settings.syncEnabled;
      syncInterval = settings.syncInterval;
      lastSyncDate = settings.lastSyncDate;
    });
    
    // Solo verificar autenticación si la sincronización está habilitada
    if (syncEnabled) {
      try {
        isAuthenticated = await googleDriveService.ensureAuthenticated();
      } catch (error) {
        log.error('Error al verificar autenticación:', error);
        isAuthenticated = false;
      }
    }
  });
  
  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });
  
  // Manejar cambio en sincronización
  async function toggleSync() {
    try {
      syncEnabled = !syncEnabled;
      await databaseService.setSyncEnabled(syncEnabled, syncInterval);
      
      if (syncEnabled && !isAuthenticated) {
        try {
          // Si activamos la sincronización, sí queremos forzar la redirección
          isAuthenticated = await googleDriveService.ensureAuthenticated(true);
        } catch (error) {
          log.error('Error al verificar autenticación:', error);
          isAuthenticated = false;
        }
      }
    } catch (error: any) {
      log.error('Error al cambiar sincronización:', error);
      syncEnabled = !syncEnabled; // Revertir cambio
    }
  }
  
  // Sincronizar ahora
  async function syncNow() {
    if (syncing) return;
    
    syncing = true;
    try {
      await databaseService.syncNow();
      lastSyncDate = new Date().toISOString();
    } catch (error: any) {
      log.error('Error al sincronizar:', error);
      alert('Error al sincronizar: ' + error.message);
    } finally {
      syncing = false;
    }
  }
  
  // Exportar base de datos
  async function exportDatabase() {
    if (exportingDb) return;
    
    exportingDb = true;
    try {
      const blob = await databaseService.exportDatabaseForDownload();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lukalibre-backup-' + new Date().toISOString().slice(0, 10) + '.wallet';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      log.error('Error al exportar base de datos:', error);
      alert('Error al exportar: ' + error.message);
    } finally {
      exportingDb = false;
    }
  }
  
  // Importar base de datos
  async function importDatabase() {
    if (!importFile || importingDb) return;
    
    importingDb = true;
    try {
      await databaseService.importDatabaseFromFile(importFile);
      alert('Base de datos importada correctamente');
      importFile = null;
      // Actualizar si se sincronizó
      if (syncEnabled) {
        lastSyncDate = new Date().toISOString();
      }
    } catch (error: any) {
      log.error('Error al importar base de datos:', error);
      alert('Error al importar: ' + error.message);
    } finally {
      importingDb = false;
    }
  }
  
  // Manejar selección de archivo
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      importFile = input.files[0];
    }
  }
</script>

<div class="sync-banner">
  <div class="sync-toolbar">
    <button class="toolbar-button download" on:click={exportDatabase} disabled={exportingDb} title="Descargar copia de seguridad">
      {#if exportingDb}
        <span class="loading-spinner"></span>
      {:else}
        ⬇️
      {/if}
      <span>DESCARGAR</span>
    </button>
    
    <label class="toolbar-button upload" title="Cargar copia de seguridad">
      ⬆️
      <span>CARGAR</span>
      <input type="file" accept=".wallet" on:change={handleFileSelect}>
    </label>
    
    <button class="toolbar-button sync {syncEnabled ? 'active' : ''}" on:click={toggleSync} title="Activar/desactivar sincronización con Google Drive">
      {syncEnabled ? '☁️' : '☁️'}
      <span>{syncEnabled ? 'DESACTIVAR SYNC' : 'ACTIVAR SYNC'}</span>
    </button>
    
    {#if syncEnabled && isAuthenticated}
      <button class="toolbar-button sync-now" on:click={syncNow} disabled={syncing} title="Sincronizar ahora">
        {#if syncing}
          <span class="loading-spinner"></span>
        {:else}
          🔄
        {/if}
        <span>SINCRONIZAR</span>
      </button>
    {/if}
  </div>
  
  {#if importFile}
    <div class="import-panel">
      <p>¿Importar archivo {importFile.name}?</p>
      <div class="import-actions">
        <button class="import-button confirm" on:click={importDatabase} disabled={importingDb}>
          {#if importingDb}
            <span class="loading-spinner"></span> Importando...
          {:else}
            Confirmar importación
          {/if}
        </button>
        <button class="import-button cancel" on:click={() => importFile = null}>Cancelar</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .sync-banner {
    background: linear-gradient(to right, #243B55, #141E30);
    color: white;
    padding: 0.4rem 1rem;
    margin: 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    position: relative;
    z-index: 10;
  }
  
  .sync-toolbar {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
  }
  
  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    background-color: transparent;
    color: white;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.8rem;
  }
  
  .toolbar-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .toolbar-button.download {
    background-color: rgba(40, 167, 69, 0.2);
  }
  
  .toolbar-button.download:hover {
    background-color: rgba(40, 167, 69, 0.3);
  }
  
  .toolbar-button.upload {
    background-color: rgba(253, 126, 20, 0.2);
    cursor: pointer;
  }
  
  .toolbar-button.upload:hover {
    background-color: rgba(253, 126, 20, 0.3);
  }
  
  .toolbar-button.sync {
    background-color: rgba(108, 117, 125, 0.2);
  }
  
  .toolbar-button.sync:hover {
    background-color: rgba(108, 117, 125, 0.3);
  }
  
  .toolbar-button.sync.active {
    background-color: rgba(0, 123, 255, 0.2);
  }
  
  .toolbar-button.sync.active:hover {
    background-color: rgba(0, 123, 255, 0.3);
  }
  
  .toolbar-button.sync-now {
    background-color: rgba(23, 162, 184, 0.2);
    padding: 0.25rem 0.5rem;
  }
  
  .toolbar-button.sync-now:hover {
    background-color: rgba(23, 162, 184, 0.3);
  }
  
  .import-panel {
    background-color: rgba(255, 255, 255, 0.9);
    color: #333;
    margin-top: 0.5rem;
    padding: 0.5rem;
    border-radius: 3px;
    text-align: center;
    font-size: 0.8rem;
  }
  
  .import-panel p {
    margin: 0 0 0.5rem 0;
    font-weight: 500;
  }
  
  .import-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }
  
  .import-button {
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 3px;
    font-weight: 500;
    cursor: pointer;
    font-size: 0.8rem;
  }
  
  .import-button.confirm {
    background-color: #28a745;
    color: white;
  }
  
  .import-button.cancel {
    background-color: #dc3545;
    color: white;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  input[type="file"] {
    display: none;
  }
  
  @media (max-width: 768px) {
    .sync-toolbar {
      justify-content: space-between;
    }
    
    .toolbar-button {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  }
</style> 