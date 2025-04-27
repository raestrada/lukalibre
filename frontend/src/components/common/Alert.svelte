<script lang="ts">
  export let title: string = '';
  export let message: string = '';
  export let type: 'success' | 'warning' | 'error' | 'info' = 'info';
  export let icon: string = '';
  export let dismissible: boolean = false;
  
  let visible = true;
  
  function dismiss() {
    visible = false;
  }
  
  // Determinar icono según el tipo si no se especifica
  $: effectiveIcon = icon || {
    'success': 'check_circle',
    'warning': 'warning',
    'error': 'error',
    'info': 'info'
  }[type];
</script>

{#if visible}
<div class="alert alert-{type}">
  <div class="alert-icon">
    <span class="material-icons">{effectiveIcon}</span>
  </div>
  <div class="alert-content">
    {#if title}
      <div class="alert-title">{title}</div>
    {/if}
    <div class="alert-message">{message}</div>
  </div>
  {#if dismissible}
    <button class="alert-dismiss" on:click={dismiss}>
      <span class="material-icons">close</span>
    </button>
  {/if}
</div>
{/if}

<style>
  .alert {
    display: flex;
    align-items: flex-start;
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-md);
    position: relative;
  }
  
  .alert-success {
    background-color: rgba(58, 99, 81, 0.1);
    border-left: 4px solid var(--success);
  }
  
  .alert-warning {
    background-color: rgba(255, 193, 7, 0.1);
    border-left: 4px solid var(--warning);
  }
  
  .alert-error {
    background-color: rgba(220, 53, 69, 0.1);
    border-left: 4px solid var(--error);
  }
  
  .alert-info {
    background-color: rgba(23, 162, 184, 0.1);
    border-left: 4px solid var(--accent);
  }
  
  .alert-icon {
    margin-right: var(--space-sm);
  }
  
  .alert-icon .material-icons {
    font-size: 1.2rem;
  }
  
  .alert-success .alert-icon {
    color: var(--success);
  }
  
  .alert-warning .alert-icon {
    color: var(--warning);
  }
  
  .alert-error .alert-icon {
    color: var(--error);
  }
  
  .alert-info .alert-icon {
    color: var(--accent);
  }
  
  .alert-content {
    flex: 1;
  }
  
  .alert-title {
    font-weight: 600;
    margin-bottom: var(--space-xs);
  }
  
  .alert-message {
    font-size: 0.95rem;
    color: var(--text-secondary);
  }
  
  .alert-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    color: var(--text-secondary);
    opacity: 0.7;
    transition: opacity 0.2s;
  }
  
  .alert-dismiss:hover {
    opacity: 1;
  }
</style>
