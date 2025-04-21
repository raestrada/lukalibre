<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  import axios from 'axios';
  
  let fullName = '';
  let email = '';
  let password = '';
  let confirmPassword = '';
  let loading = false;
  let error = '';
  
  // Obtenemos la URL de la API desde las variables de entorno
  const API_URL = import.meta.env.VITE_API_URL || '/api/v1';
  
  async function handleRegister(event: Event) {
    event.preventDefault();
    
    if (password !== confirmPassword) {
      error = 'Las contraseñas no coinciden';
      return;
    }
    
    loading = true;
    error = '';
    
    try {
      // Registrar usuario
      await axios.post(`${API_URL}/users/`, {
        email,
        password,
        full_name: fullName,
        is_active: true
      });
      
      // Iniciar sesión automáticamente
      await authStore.login(email, password);
    } catch (err: any) {
      console.error('Error de registro:', err);
      
      if (err.response && err.response.data) {
        error = err.response.data.detail || 'Error al registrarse';
      } else {
        error = 'Error al conectar con el servidor';
      }
    } finally {
      loading = false;
    }
  }
  
  function handleGoogleSignup() {
    window.location.href = authService.getGoogleAuthUrl();
  }
</script>

<div class="container">
  <div class="auth-container">
    <div class="card">
      <div class="card-header">
        <h1>Crear Cuenta</h1>
        <p>Regístrate en LukaLibre</p>
      </div>
      
      {#if error}
        <div class="alert alert-error">
          {error}
        </div>
      {/if}
      
      {#if loading}
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Creando cuenta...</p>
        </div>
      {:else}
        <form on:submit={handleRegister}>
          <div class="form-group">
            <label for="fullName">Nombre Completo</label>
            <input 
              type="text" 
              id="fullName" 
              bind:value={fullName} 
              required 
              placeholder="Tu nombre completo"
              disabled={loading}
            />
          </div>
          
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
              placeholder="Contraseña"
              disabled={loading}
            />
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirmar Contraseña</label>
            <input 
              type="password" 
              id="confirmPassword" 
              bind:value={confirmPassword} 
              required 
              placeholder="Repetir contraseña"
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            class="btn-primary full-width" 
            disabled={loading}
          >
            Crear Cuenta
          </button>
        </form>
        
        <div class="divider">
          <span>o</span>
        </div>
        
        <button 
          type="button" 
          class="btn-google full-width" 
          on:click={handleGoogleSignup}
          disabled={loading}
        >
          Registrarse con Google
        </button>
      {/if}
      
      <div class="auth-footer">
        <p>¿Ya tienes cuenta? <a href="/login" use:link>Iniciar Sesión</a></p>
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