<script lang="ts">
  import Card from './Card.svelte';
  import Icon from './Icon.svelte';
  
  export let title: string = '';
  export let icon: string = '';
  export let variant: 'default' | 'success' | 'warning' | 'error' | 'info' = 'default';
  
  // Clases basadas en la variante
  $: variantClass = variant !== 'default' ? `report-card-${variant}` : '';
</script>

<Card padding="md" hoverable={true} elevated={true} className="report-card {variantClass}">
  <div class="report-card-header">
    {#if icon}
      <span class="report-card-icon">
        <Icon name={icon} size={20} />
      </span>
    {/if}
    <h3 class="report-card-title">{title}</h3>
  </div>
  <div class="report-card-content">
    <slot></slot>
  </div>
  <div class="report-card-footer">
    <slot name="footer"></slot>
  </div>
</Card>

<style>
  /* Aplicamos estilos a los elementos internos solamente */
  .report-card-header {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-sm);
    gap: var(--space-sm);
  }
  
  .report-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--primary);
  }
  
  .report-card-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0;
    color: var(--primary);
  }
  
  .report-card-content {
    margin-bottom: var(--space-sm);
  }
  
  .report-card-footer {
    border-top: 1px solid var(--border, #eee);
    padding-top: var(--space-sm);
    margin-top: var(--space-sm);
    font-size: 0.9rem;
  }
  
  /* Aplicamos estilos específicos para variantes usando :global */
  :global(.report-card) {
    margin-bottom: var(--space-md);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  :global(.report-card-success) {
    border-left: 4px solid var(--success);
  }
  
  :global(.report-card-warning) {
    border-left: 4px solid var(--warning);
  }
  
  :global(.report-card-error) {
    border-left: 4px solid var(--error);
  }
  
  :global(.report-card-info) {
    border-left: 4px solid var(--accent);
  }
</style>
