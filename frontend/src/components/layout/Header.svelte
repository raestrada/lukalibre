<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  
  let menuOpen = false;
  
  function toggleMenu() {
    menuOpen = !menuOpen;
  }
  
  function closeMenu() {
    menuOpen = false;
  }
</script>

<header class="header">
  <div class="container">
    <div class="header-content">
      <a href="/" use:link class="brand">
        <div class="logo">
          <img src="/icons/logo.png" alt="LukaLibre Logo" />
        </div>
        <span class="brand-text">LukaLibre</span>
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
          {#if $authStore.isAuthenticated}
            <li>
              <a href="/dashboard" use:link on:click={closeMenu}>Dashboard</a>
            </li>
            <li>
              <button on:click={() => { authStore.logout(); closeMenu(); }}>
                Cerrar Sesión
              </button>
            </li>
          {:else}
            <li>
              <a href="/login" use:link on:click={closeMenu}>Iniciar Sesión</a>
            </li>
            <li>
              <a href="/register" use:link on:click={closeMenu}>Registrarse</a>
            </li>
          {/if}
        </ul>
      </nav>
    </div>
  </div>
</header>

<style>
  .header {
    background-color: white;
    box-shadow: 0 2px 10px var(--shadow);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 0;
  }
  
  .brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--text-primary);
  }
  
  .logo {
    width: 40px;
    height: 40px;
    margin-right: 0.5rem;
    overflow: hidden;
    border-radius: 8px;
  }
  
  .logo img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
  
  .brand-text {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--primary);
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
  
  .nav-list a {
    text-decoration: none;
    color: var(--text-primary);
    font-weight: 500;
    transition: color 0.2s;
  }
  
  .nav-list a:hover {
    color: var(--primary);
  }
  
  .nav-list button {
    background: none;
    border: none;
    padding: 0;
    font-size: inherit;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: color 0.2s;
  }
  
  .nav-list button:hover {
    color: var(--primary);
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
  
  @media (max-width: 768px) {
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
      background-color: white;
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