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
  <div class="sync-bar-flex">
    <span class="sync-description">Gestiona tus copias de seguridad y sincronización aquí.</span>
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
    background: rgba(255,255,255,0.85); /* Fondo blanco sutil/transparente */
    color: var(--text-primary, #212529);
    padding: 0.25rem 0.75rem; /* Mucho menos padding */
    margin: 0;
    box-shadow: none;
    border: 1.5px solid var(--border, #e0e0e0); /* Borde más sutil */
    border-radius: 12px;
    position: relative;
    z-index: 10;
    min-height: 22px; /* Mucho más baja */
    width: 100%;
    margin-top: 0.5rem;
  }
  .sync-bar-flex {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: nowrap;
    width: 100%;
    overflow-x: auto;
  }
  .sync-description {
    font-size: 0.93rem;
    color: #495057;
    opacity: 0.85;
    white-space: nowrap;
    margin-bottom: 0;
    padding-left: 0.1rem;
    flex-shrink: 0;
  }
  .sync-toolbar {
    display: flex;
    gap: 0.35rem;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: nowrap;
    min-height: 28px;
    overflow-x: auto;
  }
  
  
  .sync-toolbar {
    display: flex;
    gap: 0.35rem;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    min-height: 28px;
  }
  
  .toolbar-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.18rem;
    background: transparent;
    color: var(--primary);
    font-weight: 500;
    border: 1.5px solid var(--primary);
    border-radius: 8px;
    padding: 0.09rem 0.55rem;
    font-size: 0.92rem;
    height: 26px;
    min-width: 80px;
    transition: background 0.18s, color 0.18s, border 0.18s;
    box-sizing: border-box;
    cursor: pointer;
  }
  .toolbar-button:hover:not(:disabled) {
    background: var(--primary, #2e7d32);
    color: #fff;
    border-color: var(--primary, #2e7d32);
    box-shadow: 0 2px 8px rgba(44,62,80,0.04);
  }
  
  .toolbar-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: var(--secondary);
    color: var(--text-secondary);
  }
  .toolbar-button input[type="file"] {
    height: 32px;
    min-width: 0;
    font-size: 0.94rem;
    padding: 0;
    margin: 0;
    background: none;
    border: none;
    color: inherit;
  }
  
  .toolbar-button span {
    margin-left: 0.3rem;
    letter-spacing: 0.01em;
    font-size: 1rem;
    text-transform: none;
    display: flex;
    align-items: center;
    height: 100%;
  }
  
  .toolbar-button:hover {
    background: var(--primary-light);
    color: var(--text-inverse);
    border: 1.5px solid var(--primary);
  }
  
  .toolbar-button.active {
    background: var(--primary);
    color: var(--text-inverse);
    border: 1.5px solid var(--primary);
  }
  
  .import-panel {
    background-color: var(--secondary);
    color: var(--text-primary);
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