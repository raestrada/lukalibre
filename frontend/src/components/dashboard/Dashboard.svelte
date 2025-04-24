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
    <div class="welcome">
      <h2>Bienvenido, {user.full_name || user.email}</h2>
      <p>Esta es tu área personal en Luka Libre.</p>
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