<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import axios from 'axios';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  
  let loading = true;
  let error: string | null = null;
  
  const API_URL = '/api/v1';
  
  onMount(async () => {
    try {
      // Check if there's an error parameter in the URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('error')) {
        error = urlParams.get('error');
        loading = false;
        return;
      }

      // The backend handles the OAuth exchange
      // GET request to the callback endpoint
      const response = await axios.get(`${API_URL}/auth/google/callback${window.location.search}`, {
        withCredentials: true
      });

      if (response.data && response.data.access_token) {
        // Store the token
        authService.setToken(response.data.access_token);
        
        try {
          // Get current user data and update auth store
          const user = await authService.getCurrentUser();
          authStore.setUser(user);
          
          // Redirect to dashboard
          push('/dashboard');
        } catch (userError) {
          console.error('Error fetching user data:', userError);
          error = 'Error al obtener datos del usuario';
        }
      } else {
        error = 'No se recibió token de acceso';
      }
    } catch (err: any) {
      console.error('Error en autenticación con Google:', err);
      error = err.response?.data?.detail || 'Error durante la autenticación con Google';
    } finally {
      loading = false;
    }
  });

  function goToLogin() {
    push('/login');
  }
</script>

<div class="oauth-callback-container">
  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Procesando autenticación con Google...</p>
    </div>
  {:else if error}
    <div class="error">
      <h2>Error de autenticación</h2>
      <p>{error}</p>
      <button on:click={goToLogin}>Volver a iniciar sesión</button>
    </div>
  {/if}
</div>

<style>
  .oauth-callback-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    background-color: #f5f5f5;
  }

  .loading, .error {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
    max-width: 400px;
    width: 100%;
  }

  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #3498db;
    width: 50px;
    height: 50px;
    margin: 0 auto 1rem auto;
    animation: spin 1s linear infinite;
  }

  .error h2 {
    color: #e74c3c;
    margin-bottom: 1rem;
  }

  button {
    background-color: #3498db;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #2980b9;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style> 