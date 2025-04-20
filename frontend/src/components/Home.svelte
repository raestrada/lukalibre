<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../stores/authStore';
</script>

<div class="home-container">
  <div class="hero">
    <h1>Bienvenido a Luka Libre</h1>
    <p class="subtitle">Tu plataforma de educación financiera para Chile</p>
    
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
    <div class="feature-card">
      <h3>Aprende sobre finanzas</h3>
      <p>Accede a contenido educativo sobre inversiones, ahorro y planificación financiera.</p>
    </div>
    
    <div class="feature-card">
      <h3>Herramientas prácticas</h3>
      <p>Utiliza nuestras calculadoras y herramientas para tomar mejores decisiones financieras.</p>
    </div>
    
    <div class="feature-card">
      <h3>Comunidad activa</h3>
      <p>Conecta con otras personas interesadas en mejorar su educación financiera.</p>
    </div>
  </div>
</div>

<style>
  .home-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-md);
  }
  
  .hero {
    text-align: center;
    margin-bottom: var(--space-xxl);
    padding: var(--space-xl) 0;
  }
  
  h1 {
    font-size: 3rem;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: var(--space-md);
  }
  
  .subtitle {
    font-size: 1.5rem;
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
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-lg);
    margin-top: var(--space-xxl);
  }
  
  .feature-card {
    background-color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 8px var(--shadow);
    padding: var(--space-lg);
    text-align: center;
  }
  
  .feature-card h3 {
    color: var(--primary);
    margin-bottom: var(--space-md);
    font-size: 1.5rem;
  }
  
  .feature-card p {
    color: var(--text-secondary);
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 2.5rem;
    }
    
    .subtitle {
      font-size: 1.2rem;
    }
    
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