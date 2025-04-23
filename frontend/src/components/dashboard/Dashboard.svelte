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
  <SyncSettings />
  
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
    <div class="welcome">
      <h2>Bienvenido, {user.full_name || user.email}</h2>
      <p>Esta es tu área personal en Luka Libre.</p>
    </div>
    
    {#if dbInitialized}
      <div class="dashboard-content">
        <div class="info-card">
          <h3>Base de datos SQLite</h3>
          <p>La base de datos SQLite ha sido inicializada correctamente.</p>
          <p>Tus datos se almacenan localmente en tu navegador.</p>
        </div>
      </div>
    {:else}
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

<style>
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
  
  .spinner.small {
    width: 20px;
    height: 20px;
    border-width: 2px;
    margin-bottom: 0;
    margin-right: 8px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .welcome {
    background-color: #f5f9ff;
    padding: 1.5rem;
    border-radius: 8px;
    margin-top: 2rem;
    margin-bottom: 2rem;
    border-left: 4px solid var(--primary-color, #4a69bd);
  }
  
  .dashboard-content {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }
  
  .info-card {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
  }
  
  .gdrive-card.connected {
    border-left: 4px solid #27ae60;
  }
  
  .gdrive-card.error {
    border-left: 4px solid #e74c3c;
  }
  
  .gdrive-card.syncing {
    border-left: 4px solid #f39c12;
  }
  
  .gdrive-card.pending {
    border-left: 4px solid #3498db;
  }
  
  .sync-indicator {
    display: flex;
    align-items: center;
    margin-top: 10px;
    color: #666;
  }
  
  .info-card h3 {
    margin-top: 0;
    color: var(--primary-color, #4a69bd);
    margin-bottom: 1rem;
  }
  
  .dashboard-empty {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 3rem;
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  
  .btn-primary {
    background-color: var(--primary-color, #4a69bd);
    color: white;
    border: none;
    padding: 0.6rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .btn-primary:hover {
    background-color: #3a5a9b;
  }
  
  .btn-secondary {
    background-color: #e9ecef;
    color: #495057;
    border: 1px solid #ced4da;
    padding: 0.6rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .btn-secondary:hover {
    background-color: #dee2e6;
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