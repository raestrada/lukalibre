<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { settingsStore } from '../stores/settingsStore';
  import databaseService from '../services/databaseService';
  import googleDriveService from '../services/googleDriveService';
  import { createLogger } from '../utils/logger';
  import StatusMessage from './common/StatusMessage.svelte';

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
  let showResetModal: boolean = false;
  let resettingDb: boolean = false;
  let resetSuccess: boolean = false;
  let resetError: string | null = null;
  // Mensajes para exportar/importar
  let exportSuccess: boolean = false;
  let exportError: string | null = null;
  let importSuccess: boolean = false;
  let importError: string | null = null;

  async function confirmResetDb() {
    resettingDb = true;
    resetSuccess = false;
    resetError = null;
    try {
      await databaseService.resetDatabase();
      resetSuccess = true;
      showResetModal = false;
    } catch (err) {
      resetError = 'Error al resetear la base de datos';
    } finally {
      resettingDb = false;
    }
  }

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
    unsubscribe = settingsStore.subscribe((settings) => {
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

    try {
      syncing = true;

      // Asegurarse de que el usuario está autenticado en Google Drive
      if (!isAuthenticated) {
        try {
          isAuthenticated = await googleDriveService.ensureAuthenticated(true);
        } catch (error) {
          log.error('Error al verificar autenticación:', error);
          throw new Error('No se pudo autenticar con Google Drive');
        }
      }

      // Sincronizar base de datos
      await databaseService.syncDatabase();

      // Actualizar fecha de sincronización
      lastSyncDate = new Date().toISOString();
      await settingsStore.updateSetting('lastSyncDate', lastSyncDate);
    } catch (error: any) {
      log.error('Error sincronizando:', error);

      // Mostrar error al usuario
      alert(`Error al sincronizar: ${error.message || 'Error desconocido'}`);
    } finally {
      syncing = false;
    }
  }

  // Exportar base de datos
  async function exportDatabase() {
    if (exportingDb) return;

    // Resetear mensajes previos
    exportSuccess = false;
    exportError = null;
    importSuccess = false;
    importError = null;

    try {
      exportingDb = true;
      await databaseService.exportDatabaseForDownload();
      exportSuccess = true;
      setTimeout(() => {
        exportSuccess = false;
      }, 5000); // Auto-ocultar después de 5 segundos
    } catch (error: any) {
      log.error('Error exportando base de datos:', error);
      exportError = `Error al exportar base de datos: ${error.message || 'Error desconocido'}`;
    } finally {
      exportingDb = false;
    }
  }

  // Importar base de datos
  let importInput: HTMLInputElement;

  function openImportDialog() {
    if (importingDb) return;
    importInput.click();
  }

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      importFile = input.files[0];
    }
  }

  async function confirmImport() {
    if (importingDb || !importFile) return;

    // Resetear mensajes previos
    exportSuccess = false;
    exportError = null;
    importSuccess = false;
    importError = null;

    try {
      importingDb = true;
      await databaseService.importDatabaseFromFile(importFile);
      importFile = null;
      // Actualizar fecha de sincronización
      lastSyncDate = new Date().toISOString();
      await settingsStore.updateSetting('lastSyncDate', lastSyncDate);
      importSuccess = true;
      setTimeout(() => {
        importSuccess = false;
      }, 5000); // Auto-ocultar después de 5 segundos
    } catch (error: any) {
      log.error('Error importando base de datos:', error);
      importError = `Error al importar base de datos: ${error.message || 'Error desconocido'}`;
    } finally {
      importingDb = false;
    }
  }

  function cancelImport() {
    importFile = null;
  }
</script>

<div class="sync-banner">
  <div class="sync-bar-flex">
    <span class="sync-description">Gestiona tus copias de seguridad y sincronización aquí.</span>
    <div class="sync-toolbar">
      <button
        class="toolbar-button reset"
        on:click={() => (showResetModal = true)}
        title="Resetear base de datos">Reset DB</button
      >

      <button
        class="toolbar-button download"
        on:click={exportDatabase}
        disabled={exportingDb}
        title="Descargar copia de seguridad"
      >
        {#if exportingDb}
          <span class="loading-spinner"></span>
        {:else}
          <i class="fas fa-download"></i>
        {/if}
        Exportar
      </button>

      <input type="file" bind:this={importInput} accept=".wallet" on:change={handleFileSelect} />
      <button
        class="toolbar-button upload"
        on:click={openImportDialog}
        disabled={importingDb || !!importFile}
        title="Cargar copia de seguridad"
      >
        <i class="fas fa-upload"></i>
        Importar
      </button>

      <button
        class="toolbar-button sync"
        on:click={toggleSync}
        disabled={syncing}
        title="Activar/desactivar sincronización con Google Drive"
      >
        <i class="fas fa-cloud-{syncEnabled ? 'check' : 'upload-alt'}"></i>
        Sync {syncEnabled ? 'ON' : 'OFF'}
      </button>

      {#if syncEnabled}
        <button
          class="toolbar-button sync-now"
          on:click={syncNow}
          disabled={syncing}
          title="Sincronizar ahora con Google Drive"
        >
          {#if syncing}
            <span class="loading-spinner"></span>
          {:else}
            <i class="fas fa-sync-alt"></i>
          {/if}
          Sync Ahora
        </button>
      {/if}
    </div>
  </div>

  {#if showDetails}
    <div class="sync-details">
      <p><strong>Última sincronización:</strong> {formatDate(lastSyncDate)}</p>
      <p><strong>Intervalo de sincronización:</strong> {syncInterval} minutos</p>
      {#if syncEnabled && !isAuthenticated}
        <p class="warning">⚠️ No autenticado en Google Drive. La sincronización no funcionará.</p>
      {/if}
    </div>
  {/if}
</div>

{#if showResetModal}
  <div class="modal-overlay">
    <div class="modal">
      <h2>¿Resetear base de datos?</h2>
      <p>
        Esta acción eliminará <b>todos los datos locales</b> y creará una base vacía. No se puede deshacer.
        ¿Seguro que quieres continuar?
      </p>
      <div class="modal-actions">
        <button class="toolbar-button danger" on:click={confirmResetDb} disabled={resettingDb}
          >Sí, resetear</button
        >
        <button
          class="toolbar-button"
          on:click={() => (showResetModal = false)}
          disabled={resettingDb}>Cancelar</button
        >
      </div>
      {#if resettingDb}
        <p>Reseteando base de datos...</p>
      {/if}
      {#if resetError}
        <p class="error">{resetError}</p>
      {/if}
    </div>
  </div>
{/if}
{#if importFile}
  <StatusMessage
    type="warning"
    message={`¿Importar archivo "${importFile.name}"? Esto reemplazará todos los datos actuales.`}
    closable={false}
    actions={[
      {
        label: importingDb ? 'Importando...' : 'Confirmar',
        onClick: confirmImport,
        disabled: importingDb,
        loading: importingDb,
      },
      {
        label: 'Cancelar',
        onClick: cancelImport,
        disabled: importingDb,
      },
    ]}
  />
{/if}

{#if resetSuccess}
  <StatusMessage
    type="success"
    message="Base de datos reseteada correctamente."
    onClose={() => (resetSuccess = false)}
  />
{/if}

{#if resetError}
  <StatusMessage type="error" message={resetError} onClose={() => (resetError = null)} />
{/if}

{#if exportSuccess}
  <StatusMessage
    type="success"
    message="Base de datos exportada correctamente"
    onClose={() => (exportSuccess = false)}
  />
{/if}

{#if exportError}
  <StatusMessage type="error" message={exportError} onClose={() => (exportError = null)} />
{/if}

{#if importSuccess}
  <StatusMessage
    type="success"
    message="Base de datos importada correctamente"
    onClose={() => (importSuccess = false)}
  />
{/if}

{#if importError}
  <StatusMessage type="error" message={importError} onClose={() => (importError = null)} />
{/if}

<style>
  .modal-overlay {
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .modal {
    background: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
    max-width: 350px;
    width: 100%;
    color: #333;
  }
  .modal h2 {
    color: #212529;
    margin-bottom: 1rem;
    font-size: 1.4rem;
  }
  .modal p {
    color: #4a4a4a;
    margin-bottom: 1rem;
    font-size: 0.95rem;
    line-height: 1.4;
  }
  .modal-actions {
    margin-top: 1.5rem;
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
  }
  .toolbar-button.danger {
    background: #d32f2f;
    color: #fff;
  }
  /* Estilos eliminados ya que ahora están en el componente StatusMessage */
  .sync-banner {
    background: rgba(255, 255, 255, 0.85); /* Fondo blanco sutil/transparente */
    color: var(--text-primary, #212529);
    padding: 0.25rem 0.75rem; /* Mucho menos padding */
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .sync-banner {
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
    gap: 5px;
    cursor: pointer;
    color: var(--text-primary, #333);
    background-color: var(--btn-bg, #f8f9fa);
    border: 1px solid var(--border, #dee2e6);
    font-size: 0.85rem;
    padding: 0.3rem 0.8rem;
    border-radius: 4px;
    min-width: 40px;
    justify-content: center;
    transition: all 0.15s ease-in-out;
    text-align: center;
    white-space: nowrap;
  }

  .toolbar-button:hover {
    background-color: var(--btn-hover-bg, #e9ecef);
  }

  .toolbar-button:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
  }

  .toolbar-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .toolbar-button i {
    font-size: 0.85rem;
  }

  button.sync-now {
    background-color: var(--btn-primary-bg, #0d6efd);
    color: white;
  }

  button.sync-now:hover:not(:disabled) {
    background-color: var(--btn-primary-hover-bg, #0b5ed7);
  }

  button.sync-now:disabled {
    background-color: var(--btn-primary-disabled-bg, #8bb9fe);
  }

  .sync-details {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background-color: var(--bg-subtle, #f8f9fa);
    border-radius: 4px;
    font-size: 0.85rem;
  }

  .sync-details p {
    margin: 0.25rem 0;
  }

  .warning {
    color: var(--warning, #ffc107);
  }

  /* CSS no usado eliminado */

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
    to {
      transform: rotate(360deg);
    }
  }

  input[type='file'] {
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
