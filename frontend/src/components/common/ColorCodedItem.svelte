<script lang="ts">
  import Card from './Card.svelte';
  import Icon from './Icon.svelte';
  
  // Props
  export let type: 'default' | 'success' | 'warning' | 'info' | 'danger' = 'default';
  export let icon: string = '';
  export let label: string = '';
  export let elevated: boolean = false;
  export let interactive: boolean = true;
  export let padding: 'none' | 'sm' | 'md' | 'lg' = 'md';
</script>

<div class="color-coded-item {type}-item {elevated ? 'elevated' : ''} {interactive ? 'interactive' : ''}">
  <Card {padding} variant="outline">
    <div class="item-content">
      <slot name="before-content"></slot>
      
      {#if icon || label}
        <div class="item-header">
          {#if icon}
            <div class="item-icon">
              <Icon name={icon} />
            </div>
          {/if}
          
          {#if label}
            <div class="item-label">{label}</div>
          {/if}
        </div>
      {/if}
      
      <div class="item-body">
        <slot></slot>
      </div>
      
      <slot name="after-content"></slot>
    </div>
  </Card>
</div>

<style>
  .color-coded-item {
    position: relative;
    margin-bottom: var(--space-sm);
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  
  .color-coded-item::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: 4px 0 0 4px;
    background-color: var(--border-dark);
  }
  
  .success-item::before {
    background-color: var(--success);
  }
  
  .warning-item::before {
    background-color: var(--warning);
  }
  
  .info-item::before {
    background-color: var(--info);
  }
  
  .danger-item::before {
    background-color: var(--danger);
  }
  
  .elevated {
    box-shadow: var(--shadow-md);
  }
  
  .interactive:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
  
  .item-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  .item-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  .item-icon {
    color: var(--text-secondary);
  }
  
  .item-label {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .success-item .item-label {
    color: var(--success);
  }
  
  .warning-item .item-label {
    color: var(--warning);
  }
  
  .info-item .item-label {
    color: var(--info);
  }
  
  .danger-item .item-label {
    color: var(--danger);
  }
  
  .item-body {
    width: 100%;
  }
</style>
