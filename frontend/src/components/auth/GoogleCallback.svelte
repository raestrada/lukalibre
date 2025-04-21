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
  
  onMount(async () => {
    try {
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
        // Almacenar el token
        const token = urlParams.get('token')!;
        authService.setToken(token);
        
        // Actualizar la store de autenticación
        if (urlParams.has('user_id') && urlParams.has('email')) {
          const userId = parseInt(urlParams.get('user_id')!);
          const email = urlParams.get('email')!;
          
          try {
            // Intentar obtener datos completos del usuario
            const user = await authService.getCurrentUser();
            authStore.setUser(user);
          } catch (userError) {
            console.error('Error al obtener datos completos del usuario:', userError);
            // Crear un objeto básico con los datos que tenemos
            authStore.setUser({
              id: userId,
              email: email,
              full_name: '',
              is_active: true,
              is_superuser: false
            });
          }
          
          // Redireccionar al dashboard
          push('/dashboard');
          return;
        }
      }
      
      // Si hay un código de autorización pero no token (este es el caso inicial)
      if (urlParams.has('code') && !urlParams.has('token')) {
        // Redireccionar al backend para procesar el código
        window.location.href = `${API_BASE_URL}${API_URL}/auth/google/callback?${urlParams.toString()}`;
        return;
      }
      
      // Si no hay código ni token, hay un error
      error = 'No se recibieron parámetros de autenticación';
      loading = false;
    } catch (err: any) {
      console.error('Error en autenticación con Google:', err);
      error = err.response?.data?.detail || 'Error durante la autenticación con Google';
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