<script lang="ts">
  import Icon from './Icon.svelte';
  
  export let value: string | number = '';
  export let label: string = '';
  export let trend: 'up' | 'down' | 'neutral' = 'neutral';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let icon: string = '';
  
  $: trendClass = trend !== 'neutral' ? `trend-${trend}` : '';
  $: sizeClass = size !== 'md' ? `value-${size}` : '';
</script>

<div class="financial-value {trendClass} {sizeClass}">
  {#if icon}
    <span class="value-icon">
      <Icon name={icon} />
    </span>
  {/if}
  <div class="value-content">
    <div class="value">{value}</div>
    {#if label}
      <div class="label">{label}</div>
    {/if}
    {#if trend !== 'neutral'}
      <div class="trend-indicator">
        <span class="material-icons">
          {trend === 'up' ? 'arrow_upward' : 'arrow_downward'}
        </span>
      </div>
    {/if}
  </div>
</div>

<style>
  .financial-value {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-sm);
  }
  
  .value-content {
    display: flex;
    flex-direction: column;
  }
  
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  
  .label {
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .value-icon {
    margin-right: var(--space-sm);
    color: var(--primary);
  }
  
  .trend-indicator {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    margin-top: var(--space-xs);
  }
  
  .trend-indicator .material-icons {
    font-size: 1rem;
    margin-right: var(--space-xs);
  }
  
  /* Tendencias */
  .trend-up .trend-indicator {
    color: var(--success);
  }
  
  .trend-down .trend-indicator {
    color: var(--error);
  }
  
  /* Tamaños */
  .value-sm .value {
    font-size: 1.2rem;
  }
  
  .value-lg .value {
    font-size: 2rem;
  }
</style>
