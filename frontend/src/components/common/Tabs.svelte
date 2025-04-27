<script lang="ts">
  import Icon from './Icon.svelte';
  
  export let tabs: Array<{id: string, label: string, name: string}> = [];
  export let activeTab: string;
  export let onTabChange: (tabId: string) => void = () => {};
</script>

<div class="tabs-container">
  <div class="tabs">
    {#each tabs as tab}
      <button 
        class="tab-button" 
        class:active={activeTab === tab.id}
        on:click={() => onTabChange(tab.id)}
      >
        <Icon name={tab.name} />
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .tabs-container {
    margin-top: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    padding: 0 0.5rem;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-button:hover {
    color: var(--primary-light);
    background-color: rgba(58, 99, 81, 0.05);
  }

  .tab-button.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    font-weight: 600;
    background-color: rgba(58, 99, 81, 0.05);
  }
  
  /* Asegurar que los iconos usen el mismo color que el texto */
  .tab-button :global(.material-icons) {
    color: inherit;
  }
</style>
