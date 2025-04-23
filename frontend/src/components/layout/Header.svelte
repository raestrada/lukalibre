<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from 'svelte-spa-router';
  import { push } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  import { get } from 'svelte/store';
  import authService from '../../services/authService';
  import type { User } from '../../services/authService';
  import { createLogger } from '../../utils/logger';
  
  // Logger para este componente
  const log = createLogger('Header');
  
  // Prop para saber si Layout está inicializando la autenticación
  export let isInitializing: boolean = false;
  
  let menuOpen = false;
  let userMenuOpen = false;
  
  // Obtener usuario del authStore
  $: user = $authStore.user;
  
  // URL de la foto predeterminada (ahora usamos SVG)
  let defaultProfilePic = '/icons/user.svg';
  
  // Variable reactiva para el avatar con depuración
  $: {
    if (user) {
      log.debug("Usuario detectado:", user);
      if (user?.google_avatar) {
        log.debug("Avatar de Google encontrado:", log.trimLongString(user.google_avatar));
      }
    }
  }
  $: userAvatar = getUserAvatar(user);
  
  // Función para obtener el avatar del usuario priorizando Google
  function getUserAvatar(user: User | null) {
    if (!user) {
      log.debug("No hay usuario, usando avatar predeterminado");
      return defaultProfilePic;
    }
    
    // Si tenemos el avatar de Google, lo usamos
    if (user.google_avatar) {
      log.debug("Usando avatar de Google:", log.trimLongString(user.google_avatar));
      // Verificar si la URL está vacía (a veces Google devuelve string vacío)
      if (!user.google_avatar.trim()) {
        log.warn("Avatar de Google es string vacío");
        return defaultProfilePic;
      }
      
      // Usar directamente la URL original de Google
      return user.google_avatar;
    }
    
    // Verificar si hay un avatar guardado en localStorage
    const savedAvatar = localStorage.getItem('google_avatar');
    if (savedAvatar && savedAvatar.trim()) {
      log.debug("Usando avatar guardado en localStorage");
      return savedAvatar;
    }
    
    log.debug("No se encontró avatar, usando predeterminado:", defaultProfilePic);
    // Si no hay información, usar el avatar predeterminado
    return defaultProfilePic;
  }
  
  // Función para hacer una prueba directa del avatar en el DOM
  function testImageDirectly(url: string) {
    if (!url) return;
    
    log.debug(`Probando imagen directamente: ${log.trimLongString(url)}`);
    const img = new Image();
    
    img.onload = () => {
      log.info(`La imagen cargó correctamente: ${img.width}x${img.height}`);
    };
    
    img.onerror = (e) => {
      log.error(`Error al cargar la imagen:`, e);
    };
    
    img.src = url;
  }
  
  onMount(async () => {
    try {
      log.debug("Estado de autenticación:", get(authStore).isAuthenticated);
      // Imprimir avatar para depuración
      const currentUser = get(authStore).user;
      if (currentUser) {
        log.debug("Avatar en usuario:", log.trimLongString(currentUser.google_avatar));
        log.debug("Avatar en localStorage:", localStorage.getItem('google_avatar'));
        
        // Probar carga de imagen directamente
        if (currentUser.google_avatar) {
          testImageDirectly(currentUser.google_avatar);
        }
        
        const savedAvatar = localStorage.getItem('google_avatar');
        if (savedAvatar) {
          testImageDirectly(savedAvatar);
        }
      }
    } catch (error) {
      log.error("Error al verificar estado de autenticación:", error);
    }
  });
  
  function toggleMenu() {
    menuOpen = !menuOpen;
    // Cerrar menú de usuario si está abierto
    if (menuOpen) userMenuOpen = false;
  }
  
  function toggleUserMenu() {
    userMenuOpen = !userMenuOpen;
  }
  
  function closeMenu() {
    menuOpen = false;
  }
  
  function closeUserMenu() {
    userMenuOpen = false;
  }

  function handleLogout() {
    log.info("Usuario cerrando sesión");
    authStore.logout();
    closeMenu();
    closeUserMenu();
  }
  
  function goToSettings() {
    push('/user/settings');
    closeUserMenu();
  }
  
  function goToDashboard() {
    push('/dashboard');
    closeUserMenu();
  }
  
  // Función para manejar errores de carga de imagen
  function handleImageError(event: Event) {
    log.error("Error al cargar imagen de avatar");
    const imgElement = event.target as HTMLImageElement;
    log.warn("URL que falló:", log.trimLongString(imgElement.src));
    
    // Verificar si ya estamos usando la imagen por defecto para evitar bucles
    if (imgElement.src.includes('/icons/user.svg')) {
      log.debug("Ya estamos usando la imagen por defecto, no se realiza cambio");
      return;
    }
    
    // Aplicar imagen por defecto
    log.debug("Cambiando a imagen por defecto:", defaultProfilePic);
    imgElement.src = defaultProfilePic;
    
    // Asegurarnos de que se elimina el referrerpolicy para la imagen por defecto
    imgElement.removeAttribute('referrerpolicy');
  }
</script>

<header class="header">
  <div class="container">
    <div class="header-content">
      <a href="/" use:link class="brand">
        <div class="logo">
          <img src="/icons/logo.png" alt="LukaLibre Logo" />
        </div>
        <span class="brand-text">LukaLibre ZK App</span>
      </a>
      
      <button 
        class="menu-toggle" 
        aria-label="Abrir menú" 
        aria-expanded={menuOpen} 
        on:click={toggleMenu}
      >
        <span class="menu-icon"></span>
      </button>
      
      <nav class={menuOpen ? 'nav open' : 'nav'}>
        <ul class="nav-list">
          {#if isInitializing}
            <!-- Mostrar un placeholder mientras se verifica la autenticación -->
            <li class="loading-placeholder"></li>
          {:else if $authStore.isAuthenticated}
            <!-- Mostrar perfil de usuario en móvil -->
            <li class="mobile-only">
              <a href="/dashboard" use:link on:click={closeMenu}>
                <img src="/icons/dashboard.svg" alt="Dashboard" class="icon" />
                Dashboard
              </a>
            </li>
            <li class="mobile-only">
              <a href="/user/settings" use:link on:click={closeMenu}>
                <img src="/icons/settings.svg" alt="Configuración" class="icon" />
                Configuración
              </a>
            </li>
            <li class="mobile-only">
              <button on:click={handleLogout}>
                <img src="/icons/logout.svg" alt="Cerrar Sesión" class="icon" />
                Cerrar Sesión
              </button>
            </li>
          {:else}
            <li>
              <a href="/login" use:link on:click={closeMenu}>
                <img src="/icons/login.svg" alt="Iniciar Sesión" class="icon" />
                Iniciar Sesión
              </a>
            </li>
            <li>
              <a href="/register" use:link on:click={closeMenu}>
                <img src="/icons/register.svg" alt="Registrarse" class="icon" />
                Registrarse
              </a>
            </li>
          {/if}
        </ul>
      </nav>
      
      <!-- Menú de usuario con foto de perfil (solo escritorio) -->
      {#if !isInitializing && $authStore.isAuthenticated}
        <div class="user-menu-container desktop-only">
          <button 
            class="user-menu-toggle" 
            on:click={toggleUserMenu}
            aria-expanded={userMenuOpen}
          >
            <img 
              src={userAvatar} 
              alt="Foto de perfil" 
              class="user-avatar"
              on:error={handleImageError}
              referrerpolicy="no-referrer"
            />
          </button>
          
          {#if userMenuOpen}
            <div class="user-dropdown" on:mouseleave={closeUserMenu}>
              <div class="user-info">
                <img 
                  src={userAvatar} 
                  alt="Foto de perfil" 
                  class="user-avatar-large"
                  on:error={handleImageError}
                  referrerpolicy="no-referrer"
                />
                <div class="user-details">
                  <span class="user-name">{user?.full_name || 'Usuario'}</span>
                  <span class="user-email">{user?.email}</span>
                </div>
              </div>
              <ul class="user-menu-list">
                <li>
                  <button on:click={goToDashboard}>
                    <img src="/icons/dashboard.svg" alt="Dashboard" class="icon" />
                    Dashboard
                  </button>
                </li>
                <li>
                  <button on:click={goToSettings}>
                    <img src="/icons/settings.svg" alt="Configuración" class="icon" />
                    Configuración
                  </button>
                </li>
                <li class="divider"></li>
                <li>
                  <button on:click={handleLogout}>
                    <img src="/icons/logout.svg" alt="Cerrar Sesión" class="icon" />
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</header>

<style>
  /* Añadir estilo para el placeholder de carga */
  .loading-placeholder {
    width: 80px;
    height: 20px;
    background: #f0f0f0;
    border-radius: 4px;
    animation: pulse 1.5s infinite;
  }
  
  @keyframes pulse {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
  }
  
  .header {
    background-color: #d3e0d3;
    box-shadow: 0 1px 4px var(--shadow);
    position: sticky;
    top: 0;
    z-index: 100;
    width: 100%;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
  }
  
  .brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--text-primary);
    background-color: #d3e0d3;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
  }
  
  .logo {
    width: 80px;
    height: 40px;
    margin-right: 0.5rem;
    overflow: hidden;
  }
  
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background-color: transparent;
  }
  
  .brand-text {
    font-size: 1.25rem;
    font-weight: 600;
    color: #3A6351;
  }
  
  .nav-list {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  
  .nav-list li {
    margin-left: 1.5rem;
  }
  
  .nav-list a, 
  .nav-list button {
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 500;
    transition: color 0.2s;
    display: flex;
    align-items: center;
  }
  
  .nav-list a:hover, 
  .nav-list button:hover {
    color: var(--primary);
  }
  
  .nav-list button {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
    cursor: pointer;
    transition: color 0.2s;
  }
  
  /* Estilos para el menú de usuario */
  .user-menu-container {
    position: relative;
    margin-left: 1rem;
  }
  
  .user-menu-toggle {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  
  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  
  .user-dropdown {
    position: absolute;
    top: calc(100% + 5px);
    right: 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 250px;
    overflow: hidden;
    z-index: 200;
  }
  
  .user-info {
    padding: 1rem;
    display: flex;
    align-items: center;
    background-color: #f5f9ff;
    border-bottom: 1px solid #eee;
  }
  
  .user-avatar-large {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 1rem;
    border: 2px solid #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  
  .user-details {
    display: flex;
    flex-direction: column;
  }
  
  .user-name {
    font-weight: 600;
    font-size: 0.95rem;
  }
  
  .user-email {
    font-size: 0.85rem;
    color: #777;
    word-break: break-all;
  }
  
  .user-menu-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem 0;
  }
  
  .user-menu-list li {
    margin: 0;
  }
  
  .user-menu-list button {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    text-align: left;
    transition: background-color 0.2s;
  }
  
  .user-menu-list button:hover {
    background-color: #f5f5f5;
  }
  
  .divider {
    height: 1px;
    background-color: #eee;
    margin: 0.5rem 0;
  }
  
  .icon {
    width: 18px;
    height: 18px;
    margin-right: 10px;
    vertical-align: middle;
  }
  
  .menu-toggle {
    display: none;
    background: none;
    border: none;
    width: 30px;
    height: 30px;
    position: relative;
    cursor: pointer;
    z-index: 10;
  }
  
  .menu-icon,
  .menu-icon::before,
  .menu-icon::after {
    content: '';
    display: block;
    width: 100%;
    height: 2px;
    background-color: var(--text-primary);
    position: absolute;
    transition: all 0.3s;
  }
  
  .menu-icon {
    top: 50%;
    transform: translateY(-50%);
  }
  
  .menu-icon::before {
    top: -8px;
  }
  
  .menu-icon::after {
    bottom: -8px;
  }
  
  /* Estilos responsivos */
  .desktop-only {
    display: block;
  }
  
  .mobile-only {
    display: none;
  }
  
  @media (max-width: 768px) {
    .desktop-only {
      display: none;
    }
    
    .mobile-only {
      display: block;
    }
    
    .menu-toggle {
      display: block;
    }
    
    .nav {
      position: fixed;
      top: 0;
      right: 0;
      width: 80%;
      max-width: 300px;
      height: 100vh;
      background-color: #d3e0d3;
      box-shadow: -2px 0 10px var(--shadow);
      transform: translateX(100%);
      transition: transform 0.3s;
      padding: 6rem 2rem 2rem;
      z-index: 5;
    }
    
    .nav.open {
      transform: translateX(0);
    }
    
    .nav-list {
      flex-direction: column;
      align-items: flex-start;
    }
    
    .nav-list li {
      margin: 0 0 1.5rem 0;
      width: 100%;
    }
    
    .nav-list a, 
    .nav-list button {
      display: block;
      width: 100%;
      padding: 0.5rem 0;
      text-align: left;
    }
    
    .menu-toggle[aria-expanded="true"] .menu-icon {
      background-color: transparent;
    }
    
    .menu-toggle[aria-expanded="true"] .menu-icon::before {
      transform: rotate(45deg);
      top: 0;
    }
    
    .menu-toggle[aria-expanded="true"] .menu-icon::after {
      transform: rotate(-45deg);
      bottom: 0;
    }
  }
</style> 