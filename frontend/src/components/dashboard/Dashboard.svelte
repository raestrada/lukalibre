<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import type { User } from '../../services/authService';

  let user: User | null = null;
  let loading = true;

  onMount(() => {
    const state = authStore.getState();
    if (state.user) {
      user = state.user;
    }
    loading = false;
  });
</script>

<div class="dashboard">
  <h1>Dashboard</h1>
  
  {#if loading}
    <div class="loading">Cargando...</div>
  {:else if user}
    <div class="welcome">
      <h2>Bienvenido, {user.full_name || user.email}</h2>
      <p>Esta es tu área personal en Luka Libre.</p>
    </div>
    
    <div class="dashboard-content">
      <div class="dashboard-card">
        <h3>Tareas recientes</h3>
        <p>No hay tareas recientes.</p>
      </div>
      
      <div class="dashboard-card">
        <h3>Actividad</h3>
        <p>No hay actividad reciente.</p>
      </div>
    </div>
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
    padding: 2rem;
  }
  
  h1 {
    color: var(--primary-color, #4a69bd);
    margin-bottom: 2rem;
  }
  
  .loading {
    text-align: center;
    padding: 2rem;
    font-style: italic;
    color: #666;
  }
  
  .welcome {
    background-color: #f5f9ff;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    border-left: 4px solid var(--primary-color, #4a69bd);
  }
  
  .dashboard-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .dashboard-card {
    background-color: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
  
  .dashboard-card h3 {
    margin-top: 0;
    color: var(--primary-color, #4a69bd);
    font-size: 1.2rem;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #eaeaea;
  }
  
  .error {
    color: #d63031;
    background-color: #ffeded;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }
</style> 