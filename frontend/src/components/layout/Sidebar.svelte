<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  import { get } from 'svelte/store';
  import type { User } from '../../services/authService';

  // Acciones
  export const onLogout = () => {};
  export const onSettings = () => {};

  $: user = $authStore.user;
  let defaultProfilePic = '/icons/user.svg';
  $: userAvatar = user?.google_avatar || defaultProfilePic;
  $: userInitial = user?.full_name ? user.full_name[0].toUpperCase() : (user?.email ? user.email[0].toUpperCase() : 'U');
</script>

<aside class="sidebar">

  <nav class="sidebar-menu">
    <a href="/dashboard" use:link class="sidebar-link" aria-current="page">
      <img src="/icons/dashboard.svg" alt="Dashboard" class="icon" />
      Dashboard
    </a>
    <a href="/data" use:link class="sidebar-link">
      <img src="/icons/database.svg" alt="Datos" class="icon" />
      Datos
    </a>
    <a href="/goals" use:link class="sidebar-link">
      <img src="/icons/target.svg" alt="Metas" class="icon" />
      Metas
    </a>
  </nav>
</aside>

<style>
  .sidebar {
    width: 220px;
    background: var(--primary);
    color: var(--text-inverse);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px var(--shadow);
    position: sticky;
    top: 0;
    z-index: 90;
  }
  
  .sidebar-menu {
    display: flex;
    flex-direction: column;
    margin-top: var(--space-lg);
    gap: var(--space-sm);
    padding: 0 var(--space-md);
  }
  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    background: none;
    border: none;
    color: var(--text-inverse);
    font-size: 1rem;
    padding: 0.65rem 0.8rem;
    border-radius: var(--radius-md);
    text-decoration: none;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .sidebar-link:hover, .sidebar-link:focus {
    background: var(--primary-light);
    color: var(--text-inverse);
  }
  
  .icon {
    width: 22px;
    height: 22px;
    filter: brightness(0) invert(1);
  }
</style>
