<script lang="ts">
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  import { link } from 'svelte-spa-router';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  
  async function handleLogin(event: Event) {
    event.preventDefault();
    loading = true;
    error = '';
    
    try {
      const success = await authStore.login(email, password);
      if (!success) {
        error = $authStore.error || 'Error al iniciar sesión';
      }
    } catch (err) {
      console.error('Error de login:', err);
      error = 'Error al conectar con el servidor';
    } finally {
      loading = false;
    }
  }
  
  function handleGoogleLogin() {
    window.location.href = authService.getGoogleAuthUrl();
  }
</script>

<div class="container">
  <div class="auth-container">
    <div class="card">
      <div class="card-header">
        <h1>Iniciar Sesión</h1>
        <p>Accede a tu cuenta de LukaLibre</p>
      </div>
      
      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}
      
      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Iniciando sesión...</p>
        </div>
      {:else}
        <form on:submit={handleLogin}>
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email" 
              bind:value={email} 
              required 
              placeholder="correo@ejemplo.com"
              disabled={loading}
            />
          </div>
          
          <div class="form-group">
            <label for="password">Contraseña</label>
            <input 
              type="password" 
              id="password" 
              bind:value={password} 
              required 
              placeholder="Tu contraseña"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            class="btn-primary full-width" 
            disabled={loading}
          >
            Iniciar Sesión
          </button>
        </form>
        
        <div class="divider">
          <span>o</span>
        </div>
        
        <button 
          type="button" 
          class="btn-google full-width" 
          on:click={handleGoogleLogin}
          disabled={loading}
        >
          Continuar con Google
        </button>
      {/if}
      
      <div class="auth-footer">
        <p>¿No tienes cuenta? <a href="/register" use:link>Regístrate</a></p>
      </div>
    </div>
  </div>
</div>

<style>
  .auth-container {
    max-width: 450px;
    margin: 0 auto;
    padding: var(--space-lg) var(--space-md);
  }
  
  .full-width {
    width: 100%;
  }
  
  .divider {
    display: flex;
    align-items: center;
    margin: var(--space-md) 0;
    color: var(--text-secondary);
  }
  
  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid var(--border);
  }
  
  .divider span {
    padding: 0 var(--space-sm);
  }
  
  .btn-google {
    background-color: #f5f8f5;
    color: var(--text-primary);
    border: 1px solid var(--border);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-sm);
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, transform 0.1s;
  }
  
  .btn-google:hover {
    background-color: #eaf2ea;
    transform: translateY(-1px);
  }
  
  .btn-google:active {
    transform: translateY(0);
  }
  
  .auth-footer {
    margin-top: var(--space-lg);
    text-align: center;
  }
  
  .auth-footer p {
    margin-bottom: 0;
    font-size: 0.9rem;
  }
</style> 