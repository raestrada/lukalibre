<script lang="ts">
  import { authStore } from '../stores/authStore';

  import Button from './common/Button.svelte';
  import { push } from 'svelte-spa-router';
  // Eliminada la lógica de navegación y chequeo de autenticación automática.
  // Solo se mantiene el acceso a authStore para mostrar los botones correctos.
</script>

<div class="container">
  <!-- Eliminada la pantalla de carga por chequeo de autenticación, ya que esto lo maneja App.svelte -->
    <div class="hero">
      <h1>Bienvenido a LukaLibre ZK App</h1>
      <p class="subtitle">Tu plataforma de educación financiera con privacidad garantizada mediante Zero Knowledge</p>
      
      <div class="cta-buttons">
        {#if $authStore.isAuthenticated}
          <Button variant="primary" fullWidth={false} style="margin-right:0.7rem;" on:click={() => push('/dashboard')}>Mi Dashboard</Button>
          <Button variant="secondary" fullWidth={false} on:click={() => push('/profile')}>Mi Perfil</Button>
        {:else}
           <Button variant="primary" fullWidth={false} style="margin-right:0.7rem;" on:click={() => push('/login')}>Iniciar Sesión</Button>
           <Button variant="secondary" fullWidth={false} on:click={() => push('/register')}>Registrarse</Button>
        {/if}
      </div>
    </div>
    
    <div class="features">
      <div class="card feature-card">
        <h3>Control Total de tus Finanzas</h3>
        <p>Registra y visualiza tus ingresos, gastos y categorías en un solo lugar. Todos tus datos financieros permanecen en tu dispositivo, sin almacenarse en servidores externos.</p>
      </div>
      
      <div class="card feature-card">
        <h3>Análisis Inteligente</h3>
        <p>Importa documentos financieros y facturas para que sean procesados automáticamente con IA, ahorrando tiempo en la gestión de tus registros sin comprometer tu privacidad.</p>
      </div>
      
      <div class="card feature-card">
        <h3>Metas y Presupuesto</h3>
        <p>Establece objetivos financieros, haz seguimiento de tus ahorros, y administra un presupuesto realista adaptado a tus necesidades y estilo de vida.</p>
      </div>
    </div>
</div>

<style lang="css">

  

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
    
    /* Selector eliminado porque ya no se usa desde que cambiamos a Button */
  }
</style> 