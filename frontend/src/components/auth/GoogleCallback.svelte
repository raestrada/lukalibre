<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import axios from 'axios';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  
  let loading = true;
  let error: string | null = null;
  
  // Obtenemos la URL de la API desde las variables de entorno
  const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  
  interface AuthResponse {
    access_token: string;
    refresh_token?: string;
  }
  
  onMount(async () => {
    // Get the authorization code from the URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error');

    if (errorParam) {
      loading = false;
      error = `Error durante la autenticación con Google: ${errorParam}`;
      return;
    }

    if (!code) {
      loading = false;
      error = 'No se recibió un código de autorización de Google';
      return;
    }

    try {
      // Exchange the code for a token
      const response = await axios.post<AuthResponse>(`${API_URL}/auth/google-callback`, { code });
      
      if (response.data && response.data.access_token) {
        // Store the token
        authService.setToken(response.data.access_token);
        
        // Initialize the auth store with the token
        await authStore.init();
        
        // Redirect to dashboard
        push('/dashboard');
      } else {
        throw new Error('No se recibió un token válido');
      }
    } catch (err: any) {
      console.error('Error during Google OAuth callback:', err);
      loading = false;
      error = err.response?.data?.detail || 'Error al procesar la autenticación con Google';
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