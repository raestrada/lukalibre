<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../stores/authStore';
</script>

<div class="container">
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
    <div class="card feature-card">
      <h3>Aprende sobre finanzas</h3>
      <p>Accede a contenido educativo sobre inversiones, ahorro y planificación financiera.</p>
    </div>
    
    <div class="card feature-card">
      <h3>Herramientas prácticas</h3>
      <p>Utiliza nuestras calculadoras y herramientas para tomar mejores decisiones financieras.</p>
    </div>
    
    <div class="card feature-card">
      <h3>Comunidad activa</h3>
      <p>Conecta con otras personas interesadas en mejorar su educación financiera.</p>
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