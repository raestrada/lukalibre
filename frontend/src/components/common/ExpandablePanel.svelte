<script lang="ts">
  import { slide } from 'svelte/transition';
  import Icon from './Icon.svelte';

  // Props
  export let title: string;
  export let subtitle: string = '';
  export let icon: string = '';
  export let expanded: boolean = false;
  export let type: 'default' | 'success' | 'warning' | 'info' | 'danger' = 'default';
  export let borderPosition: 'left' | 'top' | 'none' = 'left';
  export let iconPosition: 'start' | 'end' = 'start';
  
  // Classes basadas en el tipo
  const typeClasses = {
    default: '',
    success: 'panel-success',
    warning: 'panel-warning',
    info: 'panel-info',
    danger: 'panel-danger'
  };

  // Clases para la posición del borde
  const borderClasses = {
    left: 'border-left',
    top: 'border-top',
    none: ''
  };

  function toggleExpanded() {
    expanded = !expanded;
  }
</script>

<div class="expandable-panel {typeClasses[type]} {borderClasses[borderPosition]}">
  <div
    class="panel-header"
    on:click={toggleExpanded}
    on:keydown={(e) => e.key === 'Enter' && toggleExpanded()}
    tabindex="0"
    role="button" 
    aria-expanded={expanded}
    aria-controls="panel-content"
  >
    {#if iconPosition === 'start' && icon}
      <div class="header-start">
        <Icon name={icon} />
        <div class="title-container">
          <h4 class="panel-title">{title}</h4>
          {#if subtitle}
            <div class="panel-subtitle">{subtitle}</div>
          {/if}
        </div>
      </div>
      <div class="header-end">
        <slot name="header-end"></slot>
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} />
      </div>
    {:else}
      <div class="header-start">
        <div class="title-container">
          <h4 class="panel-title">{title}</h4>
          {#if subtitle}
            <div class="panel-subtitle">{subtitle}</div>
          {/if}
        </div>
      </div>
      <div class="header-end">
        <slot name="header-end"></slot>
        {#if icon}
          <Icon name={icon} />
        {/if}
        <Icon name={expanded ? 'chevron-up' : 'chevron-down'} />
      </div>
    {/if}
  </div>

  {#if expanded}
    <div id="panel-content" class="panel-content" transition:slide={{ duration: 300 }}>
      <slot></slot>
    </div>
  {/if}
</div>

<style>
  .expandable-panel {
    position: relative;
    width: 100%;
    margin-bottom: var(--space-sm);
    border-radius: var(--radius-md);
    background-color: var(--surface);
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }

  .expandable-panel:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-md);
    cursor: pointer;
    width: 100%;
    user-select: none;
  }

  .header-start {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .header-end {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .title-container {
    display: flex;
    flex-direction: column;
  }

  .panel-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .panel-subtitle {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-top: var(--space-xs);
  }

  .panel-content {
    padding: var(--space-md);
    border-top: 1px solid var(--border-light);
    background-color: var(--surface-secondary);
  }

  /* Estilos para los tipos de paneles */
  .panel-success.border-left {
    border-left: 4px solid var(--success);
  }

  .panel-warning.border-left {
    border-left: 4px solid var(--warning);
  }

  .panel-info.border-left {
    border-left: 4px solid var(--info);
  }

  .panel-danger.border-left {
    border-left: 4px solid var(--danger);
  }

  .panel-success.border-top {
    border-top: 4px solid var(--success);
  }

  .panel-warning.border-top {
    border-top: 4px solid var(--warning);
  }

  .panel-info.border-top {
    border-top: 4px solid var(--info);
  }

  .panel-danger.border-top {
    border-top: 4px solid var(--danger);
  }

  /* Responsive */
  @media (max-width: 576px) {
    .header-end {
      flex-direction: column;
      align-items: flex-end;
    }
  }
</style>
