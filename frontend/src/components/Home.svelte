<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/authStore';
  import { push } from 'svelte-spa-router';
  import { link } from 'svelte-spa-router';
  import { get } from 'svelte/store';
  import authService from '../services/authService';
  import type { Unsubscriber } from 'svelte/store';
  
  let checkingAuth = true;
  
  onMount(() => {
    // Función asíncrona para verificar autenticación
    async function checkAuthentication() {
      try {
        console.log("Verificando estado de sesión completo...");
        
        // Verificar primero el estado del store, puede que ya esté inicializado
        const state = get(authStore);
        if (state.isAuthenticated && !state.loading) {
          console.log("Usuario ya autenticado en el store, redirigiendo...");
          checkingAuth = false;
          push('/dashboard');
          return;
        }
        
        // Comprobar tipo de token
        const tokenType = localStorage.getItem('token_type');
        
        // Si hay token de Google y datos, podemos forzar la autenticación
        if (tokenType === 'google' && localStorage.getItem('google_email')) {
          console.log("Datos de sesión Google encontrados, restaurando...");
          
          // Obtener datos guardados
          const email = localStorage.getItem('google_email') || 'usuario@google.com';
          const name = localStorage.getItem('google_name') || 'Usuario de Google';
          const avatar = localStorage.getItem('google_picture') || localStorage.getItem('google_avatar');
          
          // Forzar autenticación
          authStore.forceAuthenticated({
            id: 0,
            email: email,
            full_name: name,
            is_active: true,
            is_superuser: false,
            google_avatar: avatar || undefined
          });
          
          console.log("Sesión Google restaurada manualmente");
          checkingAuth = false;
          push('/dashboard');
          return;
        }
        
        // Usar el método que verifica la sesión completa
        const isAuthenticated = await authService.checkSession();
        
        if (isAuthenticated) {
          console.log("Sesión activa detectada, inicializando authStore...");
          await authStore.init();
          // La redirección se realizará en la suscripción si el usuario está autenticado
        } else {
          console.log("No hay sesión activa");
          checkingAuth = false;
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        checkingAuth = false;
      }
    }
    
    // Ejecutar la verificación
    checkAuthentication();
    
    // Suscribirse para detectar cambios de estado
    const unsubscribe = authStore.subscribe(state => {
      if (!state.loading) {
        checkingAuth = false;
        
        if (state.isAuthenticated) {
          console.log("Usuario autenticado, redirigiendo al dashboard...");
          push('/dashboard');
        }
      }
    });
    
    return unsubscribe;
  });

  function goToLogin() {
    push('/login');
  }
</script>

<div class="container">
  {#if checkingAuth}
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Verificando sesión...</p>
    </div>
  {:else}
    <div class="hero">
      <h1>Bienvenido a LukaLibre ZK App</h1>
      <p class="subtitle">Tu plataforma de educación financiera con privacidad garantizada mediante Zero Knowledge</p>
      
      <div class="cta-buttons">
        {#if $authStore.isAuthenticated}
          <a href="/dashboard" use:link class="btn-primary">Mi Dashboard</a>
          <a href="/profile" use:link class="btn-secondary">Mi Perfil</a>
        {:else}
          <a href="/login" use:link class="btn-primary">Iniciar Sesión</a>
          <a href="/register" use:link class="btn-secondary">Registrarse</a>
        {/if}
      </div>
    </div>
    
    <div class="features">
      <div class="card feature-card">
        <h3>Privacidad de Datos</h3>
        <p>Tus datos financieros están protegidos mediante tecnología Zero Knowledge. Nadie, ni siquiera nosotros, puede ver tu información financiera personal.</p>
      </div>
      
      <div class="card feature-card">
        <h3>Verificación sin Divulgación</h3>
        <p>Demuestra tus activos y transacciones financieras sin revelar montos exactos o detalles sensibles, gracias a las pruebas de Zero Knowledge.</p>
      </div>
      
      <div class="card feature-card">
        <h3>Educación Financiera Segura</h3>
        <p>Aprende sobre finanzas personales y recibe recomendaciones basadas en tus datos, sin comprometer tu privacidad ni seguridad.</p>
      </div>
    </div>
  {/if}
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 50vh;
    padding: var(--space-xl) 0;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid var(--primary);
    width: 40px;
    height: 40px;
    margin-bottom: var(--space-md);
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Mantener estilos existentes */
  .hero {
    text-align: center;
    margin-bottom: var(--space-xl);
    padding: var(--space-xl) 0;
  }
  
  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 700;
    color: var(--primary);
    margin-bottom: var(--space-md);
  }
  
  .subtitle {
    font-size: clamp(1.2rem, 2.5vw, 1.5rem);
    color: var(--text-secondary);
    margin-bottom: var(--space-xl);
  }
  
  .cta-buttons {
    display: flex;
    justify-content: center;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }
  
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg);
    margin-top: var(--space-xl);
    margin-bottom: var(--space-xl);
  }
  
  .feature-card {
    text-align: center;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    transition: transform 0.3s, box-shadow 0.3s;
  }
  
  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 4px 12px var(--shadow);
  }
  
  .feature-card h3 {
    color: var(--primary);
    margin-bottom: var(--space-md);
    font-size: 1.5rem;
  }
  
  .feature-card p {
    color: var(--text-secondary);
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    .cta-buttons {
      flex-direction: column;
      align-items: center;
    }
    
    .cta-buttons a {
      width: 100%;
      max-width: 250px;
    }
  }
</style> 