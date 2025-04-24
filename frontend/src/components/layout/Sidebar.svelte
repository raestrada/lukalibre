<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  import { get } from 'svelte/store';
  import type { User } from '../../services/authService';

  // Acciones
  export let onLogout = () => {};
  export let onSettings = () => {};

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
    <button class="sidebar-link sidebar-link-logout" on:click={onLogout}>
      <img src="/icons/logout.svg" alt="Cerrar Sesión" class="icon" />
      Cerrar Sesión
    </button>
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
  .sidebar-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-lg) var(--space-md) var(--space-md) var(--space-md);
    border-bottom: 1px solid var(--primary-light);
    background: var(--primary);
  }
  .sidebar-avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--primary-light);
    color: var(--text-inverse);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    font-weight: 600;
    margin-bottom: var(--space-sm);
    border: 2px solid var(--primary-light);
  }
  .sidebar-avatar-initials {
    background: var(--primary-light);
    color: var(--text-inverse);
    border: 2px solid var(--primary-light);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    font-size: 1.6rem;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: var(--space-sm);
  }
  .sidebar-user {
    text-align: center;
  }
  .sidebar-name {
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--text-inverse);
    display: block;
  }
  .sidebar-email {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.7);
    display: block;
    word-break: break-all;
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
  .sidebar-link-logout {
    color: var(--error);
  }
  .sidebar-link-logout:hover, .sidebar-link-logout:focus {
    background: rgba(220, 53, 69, 0.15);
    color: var(--error);
  }
  .icon {
    width: 22px;
    height: 22px;
    filter: brightness(0) invert(1);
  }
</style>
