<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import axios from 'axios';
  import authService from '../../services/authService';
  
  let loading = true;
  let error = '';
  
  const API_URL = '/api/v1';
  
  onMount(async () => {
    try {
      const url = new URL(window.location.href);
      const errorParam = url.searchParams.get('error');
      
      if (errorParam) {
        error = `Error de autenticación con Google: ${errorParam}`;
        loading = false;
        return;
      }
      
      // Intentar obtener el token de la sesión (endpoint personalizado)
      try {
        const response = await axios.get(`${API_URL}/auth/session`, {
          withCredentials: true
        });
        
        if (response.data && response.data.access_token) {
          authService.setToken(response.data.access_token);
          push('/dashboard');
        } else {
          // Si el token no está disponible, intentar refresh token
          try {
            const tokenResponse = await authService.refreshToken();
            if (tokenResponse.access_token) {
              push('/dashboard');
            } else {
              error = 'No se pudo obtener el token de autenticación';
            }
          } catch (refreshError) {
            error = 'Error durante el proceso de autenticación';
          }
        }
      } catch (sessionError) {
        error = 'Error al verificar la sesión';
      }
    } catch (err) {
      console.error('Error en el callback de Google:', err);
      error = 'Error durante el proceso de autenticación';
    } finally {
      loading = false;
    }
  });
</script>

<div class="callback-container">
  <div class="callback-card">
    {#if loading}
      <div class="loading-state">
        <h2>Procesando la autenticación...</h2>
        <p>Por favor espere mientras completamos el proceso.</p>
        <div class="spinner"></div>
      </div>
    {:else if error}
      <div class="error-state">
        <h2>Error de Autenticación</h2>
        <p>{error}</p>
        <button 
          on:click={() => push('/login')}
          class="btn-primary"
        >
          Volver al Inicio de Sesión
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .callback-container {
    max-width: 500px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-md);
  }
  
  .callback-card {
    background-color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 10px var(--shadow);
    padding: var(--space-xl);
    text-align: center;
  }
  
  .loading-state h2,
  .error-state h2 {
    color: var(--primary);
    margin-bottom: var(--space-md);
  }
  
  .loading-state p,
  .error-state p {
    color: var(--text-secondary);
    margin-bottom: var(--space-lg);
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid var(--primary);
    width: 40px;
    height: 40px;
    margin: 0 auto;
    animation: spin 1s linear infinite;
  }
  
  .error-state button {
    margin-top: var(--space-md);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style> 