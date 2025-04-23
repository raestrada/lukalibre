<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import axios from 'axios';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  
  let loading = true;
  let error: string | null = null;
  let debugInfo: string | null = null;
  
  // Obtenemos la URL de la API desde las variables de entorno
  const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
  
  onMount(async () => {
    try {
      // Verificar si el componente se cargó desde una URL sin hash (ya manejada por App.svelte)
      if (window.location.pathname === '/auth/callback') {
        console.log("GoogleCallback: URL sin hash detectada, saltando procesamiento (ya manejado por App)");
        
        // Verificar si ya estamos autenticados
        if (authStore.getState().isAuthenticated) {
          console.log("GoogleCallback: Ya autenticado, redirigiendo al dashboard");
          push('/dashboard');
          return;
        }
        
        loading = false;
        return;
      }
      
      // Registrar toda la URL para debugging
      debugInfo = `URL: ${window.location.href}`;
      console.log("URL completa:", window.location.href);
      
      // Obtener parámetros de la URL
      const urlParams = new URLSearchParams(window.location.search);
      
      // Si hay un error, mostrarlo
      if (urlParams.has('error')) {
        error = urlParams.get('error');
        loading = false;
        return;
      }
      
      // Si hay un token, procesarlo (este caso ocurre cuando el backend redirige de vuelta)
      if (urlParams.has('token')) {
        try {
          // Almacenar el token
          const token = urlParams.get('token')!;
          authService.setToken(token);
          
          // Inicializar la store de autenticación
          await authStore.init();
          
          // Registrar para depuración
          const state = authStore.getState();
          console.log("Token almacenado y authStore inicializado. Usuario:", state.user ? state.user.email : "No disponible");
          
          // Redirigir directamente al dashboard
          console.log("Redirigiendo al dashboard...");
          push('/dashboard');
          return;
        } catch (err) {
          console.error("Error procesando token:", err);
          error = "Error al procesar el token de autenticación";
          loading = false;
          return;
        }
      }
      
      // Si hay un código de autorización
      if (urlParams.has('code')) {
        // Obtener el código
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        
        try {
          // Llamar a nuestro endpoint en el backend
          const response = await axios.post(`${API_URL}/auth/google-callback`, { 
            code, 
            state 
          });
          
          if (response.data && response.data.access_token) {
            // Guardar el token de acceso
            authService.setToken(response.data.access_token);
            
            // Inicializar el store de autenticación con el token
            await authStore.init();
            
            // Registrar para depuración
            const storeState = authStore.getState();
            console.log("Token almacenado y authStore inicializado. Usuario:", storeState.user ? storeState.user.email : "No disponible");
            
            // Redirigir directamente al dashboard
            console.log("Redirigiendo al dashboard...");
            push('/dashboard');
            return;
          } else {
            throw new Error('No se recibió un token válido');
          }
        } catch (err: any) {
          console.error('Error al procesar el código de autorización:', err);
          error = err.response?.data?.detail || 'Error al procesar la autenticación con Google';
          debugInfo = `Error detallado: ${JSON.stringify(err.response?.data || err.message)}`;
          loading = false;
        }
        return;
      }
      
      // Si no hay código ni token, hay un error
      error = 'No se recibieron parámetros de autenticación';
      loading = false;
    } catch (err: any) {
      console.error('Error en autenticación con Google:', err);
      error = err.response?.data?.detail || 'Error durante la autenticación con Google';
      debugInfo = `Error general: ${err.message}`;
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
      {#if debugInfo}
        <details>
          <summary>Información de depuración</summary>
          <pre>{debugInfo}</pre>
        </details>
      {/if}
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
  
  details {
    margin: 1rem 0;
    text-align: left;
  }
  
  pre {
    background: #f0f0f0;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.8rem;
  }
  
  summary {
    cursor: pointer;
    color: #666;
    font-size: 0.9rem;
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