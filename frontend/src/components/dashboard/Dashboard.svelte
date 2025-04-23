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
    
    <div class="dashboard-empty">
      <div class="empty-message">
        <p>El dashboard está actualmente vacío.</p>
        <p>Próximamente añadiremos funcionalidades y herramientas para mejorar tu experiencia.</p>
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
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }
</style> 