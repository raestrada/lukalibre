<script lang="ts">
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  import { link } from 'svelte-spa-router';
  
  let loading = false;
  let error = '';
  
  function handleGoogleLogin() {
    window.location.href = authService.getGoogleAuthUrl();
  }
</script>

<div class="container">
  <div class="auth-container">
    <div class="card">
      <div class="card-header">
        <h1>Iniciar Sesión</h1>
        <p>Accede a tu cuenta de LukaLibre con Google</p>
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
        <div class="google-auth-container">
          <p class="auth-message">Para sincronizar datos entre dispositivos, usamos Google Drive como almacenamiento seguro</p>
          
          <button 
            type="button" 
            class="btn-google full-width" 
            on:click={handleGoogleLogin}
            disabled={loading}
          >
            <img src="/icons/google.svg" alt="Google" />
            <span>Iniciar sesión con Google</span>
          </button>
        </div>
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
  
  .google-auth-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-md) 0;
  }
  
  .auth-message {
    text-align: center;
    margin-bottom: var(--space-md);
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .btn-google {
    background-color: white;
    color: #757575;
    border: 1px solid #dddddd;
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background-color 0.2s, box-shadow 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    font-size: 1rem;
  }
  
  .btn-google img {
    margin-right: 10px;
    width: 20px;
    height: 20px;
  }
  
  .btn-google:hover {
    box-shadow: 0 2px 4px rgba(0,0,0,0.15);
    background-color: #fafafa;
  }
  
  .btn-google:active {
    background-color: #f5f5f5;
  }
  
  .auth-footer {
    margin-top: var(--space-lg);
    text-align: center;
  }
  
  .auth-footer p {
    margin-bottom: 0;
    font-size: 0.9rem;
  }
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-md) 0;
  }
  
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top: 4px solid #3498db;
    width: 30px;
    height: 30px;
    margin: 0 auto var(--space-sm) auto;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style> 