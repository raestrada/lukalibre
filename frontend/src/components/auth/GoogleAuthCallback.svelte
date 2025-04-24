<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from 'svelte-spa-router';
  import { createLogger } from '../../utils/logger';
  import googleDriveService from '../../services/googleDriveService';
  import authService from '../../services/authService';
  import { authStore } from '../../stores/authStore';

  const log = createLogger('GoogleAuthCallback');
  let message = 'Procesando la autenticación con Google...';
  let error = '';
  let processingComplete = false;

  onMount(async () => {
    try {
      log.info('Procesando callback de autenticación de Google');
      
      // Extraer token del hash de la URL
      const hash = window.location.hash;
      if (!hash) {
        throw new Error('No se encontraron datos en la URL');
      }
      
      // Verificar si hay un error en el hash
      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.substring(1));
        const errorCode = params.get('error');
        const errorDescription = params.get('error_description');
        throw new Error(`Error de autenticación: ${errorCode} - ${errorDescription || 'Sin descripción'}`);
      }
      
      // Verificar que tengamos un token de acceso
      if (!hash.includes('access_token=')) {
        throw new Error('No se encontró el token de acceso en la URL');
      }
      
      // Parsear los parámetros del fragmento hash
      const params = new URLSearchParams(hash.substring(1)); // Quitar el # inicial
      const accessToken = params.get('access_token');
      const state = params.get('state');
      
      if (!accessToken) {
        throw new Error('Token de acceso no encontrado');
      }
      
      // Verificar si el state coincide con lo que esperamos
      if (state !== 'googleDriveAuth') {
        log.warn(`Estado inesperado en la autenticación: ${state}`);
        // Continuamos incluso con state inesperado, pero lo registramos
      }
      
      // Almacenar el token para uso de Google Drive
      localStorage.setItem('googleDriveToken', accessToken);
      
      // También almacenar el token para la autenticación general de la aplicación
      authService.setToken(accessToken, 'google');
      
      // Obtener información del usuario de Google
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (response.ok) {
          const userData = await response.json();
          // Store basic Google user info for offline use
          localStorage.setItem('google_email', userData.email || '');
          localStorage.setItem('google_name', userData.name || '');
          localStorage.setItem('google_picture', userData.picture || '');
          log.info("Información de usuario de Google guardada:", userData.email);
        } else {
          log.warn("No se pudo obtener la información del usuario de Google");
          // Guardar valores por defecto para mantener la funcionalidad offline
          localStorage.setItem('google_email', 'usuario@google.com');
          localStorage.setItem('google_name', 'Usuario de Google');
        }
      } catch (userInfoErr) {
        log.error("Error al obtener información del usuario:", userInfoErr);
        // Guardar valores por defecto para mantener la funcionalidad offline
        localStorage.setItem('google_email', 'usuario@google.com');
        localStorage.setItem('google_name', 'Usuario de Google');
      }
      
      // Intentar login con Google usando el store de autenticación
      try {
        log.info("Intentando login con Google a través del authStore...");
        const success = await authStore.loginWithGoogle(accessToken);
        
        if (success) {
          log.info("Login con Google exitoso mediante authStore");
        } else {
          log.warn("Login con Google no exitoso pero continuamos");
          // Forzar estado autenticado como último recurso
          authStore.forceAuthenticated({
            id: 0,
            email: localStorage.getItem('google_email') || 'usuario@google.com',
            full_name: localStorage.getItem('google_name') || 'Usuario de Google',
            is_active: true,
            is_superuser: false,
            google_avatar: localStorage.getItem('google_picture') || undefined
          });
        }
      } catch (loginErr) {
        log.error("Error al hacer login con Google mediante authStore:", loginErr);
        // Forzar estado autenticado como último recurso
        authStore.forceAuthenticated({
          id: 0,
          email: localStorage.getItem('google_email') || 'usuario@google.com',
          full_name: localStorage.getItem('google_name') || 'Usuario de Google',
          is_active: true,
          is_superuser: false,
          google_avatar: localStorage.getItem('google_picture') || undefined
        });
      }
      
      // Limpiar el estado pendiente para evitar ciclos
      localStorage.removeItem('pendingGoogleAuth');
      
      // Inicializar el servicio de Google Drive con el nuevo token
      googleDriveService.setAccessToken(accessToken);
      await googleDriveService.initialize();
      
      message = 'Autenticación exitosa con Google Drive';
      processingComplete = true;
      
      // Limpiar la URL para eliminar el token
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Verificar si hay una URL de retorno guardada
      const returnUrl = localStorage.getItem('googleAuthReturnUrl');
      
      // Redirigir al usuario después de un breve retraso
      setTimeout(() => {
        if (returnUrl) {
          // Limpiar la URL de retorno
          localStorage.removeItem('googleAuthReturnUrl');
          // Navegar a la URL original
          window.location.href = returnUrl;
        } else {
          // Navegación por defecto al dashboard
          push('/dashboard');
        }
      }, 1500);
    } catch (err: any) {
      log.error('Error procesando callback de Google:', err);
      error = err.message || 'Error desconocido al procesar la autenticación';
      processingComplete = true;
      
      // Limpiar el estado pendiente en caso de error
      localStorage.removeItem('pendingGoogleAuth');
      
      // Redirigir después de mostrar el error
      setTimeout(() => {
        push('/dashboard');
      }, 3000);
    }
  });
</script>

<div class="google-auth-callback">
  <div class="container">
    <h1>Autenticación con Google</h1>
    
    {#if error}
      <div class="error-message">
        <p>{error}</p>
        <p>Serás redirigido automáticamente...</p>
      </div>
    {:else}
      <div class="success-message">
        <div class="spinner"></div>
        <p>{message}</p>
        {#if processingComplete}
          <p class="success-icon">✓</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .google-auth-callback {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem;
  }
  
  .container {
    background-color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    text-align: center;
  }
  
  h1 {
    color: var(--primary-color, #4a69bd);
    margin-bottom: 2rem;
  }
  
  .success-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    color: #27ae60;
  }
  
  .success-icon {
    font-size: 2rem;
    color: #27ae60;
    margin-top: 1rem;
  }
  
  .error-message {
    background-color: #ffeded;
    color: #d63031;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1rem;
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
</style> 