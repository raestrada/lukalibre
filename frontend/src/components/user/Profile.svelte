<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '../../stores/authStore';
  import authService from '../../services/authService';
  import axios from 'axios';
  import type { User } from '../../services/authService';
  import { push } from 'svelte-spa-router';
  import { API_URL } from '../../services/httpService';
  
  let user = authStore.getState().user;
  let loading = true;
  let editMode = false;
  let message = { text: '', type: '' };
  
  // Campos editables
  let fullName = user?.full_name || '';
  let email = user?.email || '';
  
  onMount(async () => {
    console.log("Profile - Estado de autenticación:", authStore.getState().isAuthenticated);
    console.log("Profile - Usuario actual:", user ? user.email : "No disponible");
    
    // Verificar si hay sesión activa
    if (!user) {
      const isAuthenticated = await authService.checkSession();
      if (!isAuthenticated) {
        console.log("Usuario no autenticado, redirigiendo a login");
        push('/login');
        return;
      }
      
      // Si hay sesión pero no usuario, obtenerlo
      await fetchUserData();
    } else {
      // Asegurarse de que tengamos la información más actualizada
      fetchUserData();
    }
    
    loading = false;
  });
  
  const fetchUserData = async () => {
    loading = true;
    try {
      console.log("Obteniendo datos de usuario desde API...");
      const token = authService.getToken();
      if (!token) {
        console.error("No se encontró token");
        push('/login');
        return;
      }
      
      const response = await axios.get<User>(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data) {
        // Asegurarse de que la respuesta tenga los datos necesarios
        const userData: User = response.data;
        user = userData;
        fullName = userData.full_name || '';
        email = userData.email || '';
        authStore.setUser(userData);
        console.log("Datos de usuario obtenidos correctamente:", userData.email);
      }
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      message = { text: 'No se pudieron cargar los datos del perfil', type: 'error' };
      
      // Si hay un error de autenticación, redireccionar al login
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        authStore.logout();
      }
    } finally {
      loading = false;
    }
  };
  
  const updateProfile = async () => {
    if (!user) return;
    
    loading = true;
    message = { text: '', type: '' };
    
    try {
      const token = authService.getToken();
      if (!token) return;
      
      const response = await axios.put<User>(
        `${API_URL}/users/me`,
        { full_name: fullName, email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        user = response.data;
        authStore.setUser(user);
        message = { text: 'Perfil actualizado correctamente', type: 'success' };
        editMode = false;
      }
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      message = { text: 'Error al actualizar el perfil', type: 'error' };
    } finally {
      loading = false;
    }
  };
  
  const toggleEditMode = () => {
    if (!user) return;
    
    if (editMode) {
      // Cancelar edición, restaurar valores originales
      fullName = user.full_name || '';
      email = user.email || '';
    }
    editMode = !editMode;
    message = { text: '', type: '' };
  };
</script>

<div class="profile-container">
  <div class="profile-card">
    <h1>Perfil de Usuario</h1>
    
    {#if loading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Cargando datos del perfil...</p>
      </div>
    {:else if user}
      {#if message.text}
        <div class="alert {message.type}">
          {message.text}
        </div>
      {/if}
      
      <div class="profile-content">
        {#if editMode}
          <form on:submit|preventDefault={updateProfile}>
            <div class="form-group">
              <label for="fullName">Nombre completo</label>
              <input 
                type="text" 
                id="fullName" 
                bind:value={fullName} 
                placeholder="Nombre completo"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="email">Correo electrónico</label>
              <input 
                type="email" 
                id="email" 
                bind:value={email} 
                placeholder="Correo electrónico"
                required
              />
            </div>
            
            <div class="button-group">
              <button type="submit" class="btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button type="button" class="btn-secondary" on:click={toggleEditMode}>
                Cancelar
              </button>
            </div>
          </form>
        {:else}
          <div class="profile-info">
            <div class="info-group">
              <span class="label">Nombre completo:</span>
              <span class="value">{user.full_name || 'No especificado'}</span>
            </div>
            
            <div class="info-group">
              <span class="label">Correo electrónico:</span>
              <span class="value">{user.email}</span>
            </div>
            
            <div class="info-group">
              <span class="label">ID de usuario:</span>
              <span class="value">{user.id}</span>
            </div>
            
            {#if user.created_at}
              <div class="info-group">
                <span class="label">Fecha de registro:</span>
                <span class="value">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            {/if}
            
            <button class="btn-primary" on:click={toggleEditMode}>
              Editar perfil
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <div class="error-state">
        <p>No se ha podido cargar la información del usuario.</p>
        <button class="btn-primary" on:click={fetchUserData}>
          Reintentar
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-md);
  }
  
  .profile-card {
    background-color: white;
    border-radius: var(--radius-md);
    box-shadow: 0 2px 10px var(--shadow);
    padding: var(--space-xl);
  }
  
  h1 {
    color: var(--primary);
    margin-bottom: var(--space-xl);
    text-align: center;
  }
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
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
  
  .alert {
    padding: var(--space-md);
    border-radius: var(--radius-sm);
    margin-bottom: var(--space-lg);
    text-align: center;
  }
  
  .alert.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .alert.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .form-group {
    margin-bottom: var(--space-md);
  }
  
  .form-group label {
    display: block;
    margin-bottom: var(--space-xs);
    font-weight: 500;
    color: var(--text-primary);
  }
  
  .form-group input {
    width: 100%;
    padding: var(--space-sm);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: 1rem;
  }
  
  .button-group {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-lg);
  }
  
  .profile-info {
    padding: var(--space-md) 0;
  }
  
  .info-group {
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-wrap: wrap;
  }
  
  .info-group .label {
    font-weight: 600;
    color: var(--text-secondary);
    width: 170px;
    margin-right: var(--space-md);
  }
  
  .info-group .value {
    color: var(--text-primary);
    flex: 1;
  }
  
  .error-state {
    text-align: center;
    padding: var(--space-lg);
  }
  
  .error-state p {
    margin-bottom: var(--space-md);
    color: var(--text-secondary);
  }
</style> 