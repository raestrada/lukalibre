<script lang="ts">
  import { link } from 'svelte-spa-router';
  import { authStore } from '../../stores/authStore';
  import { get } from 'svelte/store';
  import type { User } from '../../services/authService';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Acciones
  export const onLogout = () => {};
  export const onSettings = () => {};

  // Estado para controlar si el sidebar está expandido o colapsado
  const expandedStore = writable(false); // Por defecto colapsado
  $: expanded = $expandedStore;

  // Función para alternar entre expandido y colapsado
  function toggleSidebar() {
    expandedStore.update((value) => !value);
    // Guardar preferencia en localStorage
    localStorage.setItem('sidebar_expanded', expanded ? 'false' : 'true');
  }

  // Cargar preferencia de usuario desde localStorage al montar el componente
  onMount(() => {
    const savedExpanded = localStorage.getItem('sidebar_expanded');
    if (savedExpanded !== null) {
      expandedStore.set(savedExpanded === 'true');
    }
  });

  $: user = $authStore.user;
  let defaultProfilePic = '/icons/user.svg';
  $: userAvatar = user?.google_avatar || defaultProfilePic;
  $: userInitial = user?.full_name
    ? user.full_name[0].toUpperCase()
    : user?.email
      ? user.email[0].toUpperCase()
      : 'U';
</script>

<aside class="sidebar {expanded ? 'expanded' : 'collapsed'}">
  <button
    class="toggle-button"
    on:click={toggleSidebar}
    aria-label={expanded ? 'Colapsar menú' : 'Expandir menú'}
    title={expanded ? 'Colapsar menú' : 'Expandir menú'}
  >
    <img
      src="/icons/{expanded ? 'chevron-left' : 'chevron-right'}.svg"
      alt={expanded ? 'Colapsar' : 'Expandir'}
      class="icon toggle-icon"
    />
  </button>

  <nav class="sidebar-menu">
    <a href="/dashboard" use:link class="sidebar-link" aria-current="page">
      <img src="/icons/dashboard.svg" alt="Dashboard" class="icon" />
      {#if expanded}
        <span class="link-text">Dashboard</span>
      {/if}
    </a>
    <a href="/data" use:link class="sidebar-link">
      <img src="/icons/database.svg" alt="Datos" class="icon" />
      {#if expanded}
        <span class="link-text">Datos</span>
      {/if}
    </a>
    <a href="/goals" use:link class="sidebar-link">
      <img src="/icons/target.svg" alt="Metas" class="icon" />
      {#if expanded}
        <span class="link-text">Metas</span>
      {/if}
    </a>
  </nav>
</aside>

<style>
  .sidebar {
    background: var(--primary);
    color: var(--text-inverse);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    box-shadow: 2px 0 8px var(--shadow);
    position: sticky;
    top: 0;
    z-index: 90;
    transition: width 0.3s ease;
  }

  .expanded {
    width: 220px;
  }

  .collapsed {
    width: 64px;
  }

  .toggle-button {
    position: absolute;
    top: 1rem;
    right: -12px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary);
    border: 1px solid var(--primary-light);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 100;
    padding: 0;
    transition: background 0.2s;
  }

  .toggle-button:hover {
    background: var(--primary-dark);
  }

  .toggle-icon {
    width: 16px;
    height: 16px;
    filter: brightness(0) invert(1);
  }

  .sidebar-menu {
    display: flex;
    flex-direction: column;
    margin-top: var(--space-xl);
    gap: var(--space-sm);
    padding: 0 var(--space-sm);
    overflow: hidden;
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
    transition:
      background 0.15s,
      color 0.15s;
    white-space: nowrap;
    justify-content: center;
  }

  .expanded .sidebar-link {
    justify-content: flex-start;
  }

  .sidebar-link:hover,
  .sidebar-link:focus {
    background: var(--primary-light);
    color: var(--text-inverse);
  }

  .icon {
    width: 22px;
    height: 22px;
    filter: brightness(0) invert(1);
  }

  .link-text {
    transition: opacity 0.2s ease;
    opacity: 1;
  }

  .collapsed .link-text {
    opacity: 0;
  }
</style>
