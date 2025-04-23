<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../stores/authStore';
  import { push } from 'svelte-spa-router';
  import { link } from 'svelte-spa-router';
  
  onMount(() => {
    // Verificar si el usuario está autenticado y redirigirlo al dashboard
    const unsubscribe = authStore.subscribe(state => {
      if (state.isAuthenticated && !state.loading) {
        push('/dashboard');
      }
    });
    
    return unsubscribe;
  });
</script>

<div class="container">
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
</div>

<style>
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