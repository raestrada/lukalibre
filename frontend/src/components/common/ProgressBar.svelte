<script lang="ts">
  export let value: number = 0; // Valor actual (0-100)
  export let max: number = 100; // Valor máximo
  export let label: string = ''; // Etiqueta opcional
  export let showPercentage: boolean = true; // Mostrar porcentaje
  export let height: string = '10px'; // Altura de la barra
  export let variant: 'default' | 'success' | 'warning' | 'error' = 'default'; // Variante de color
  
  // Calcular porcentaje
  $: percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  // Determinar clase de color según variante
  $: colorClass = variant !== 'default' ? `progress-${variant}` : '';
  
  // Determinar clase según el porcentaje
  $: stateClass = percentage >= 100 ? 'progress-complete' : 
                 percentage >= 66 ? 'progress-high' :
                 percentage >= 33 ? 'progress-medium' : 'progress-low';
</script>

<div class="progress-container">
  {#if label}
    <div class="progress-label">
      <span>{label}</span>
      {#if showPercentage}
        <span class="progress-percentage">{percentage.toFixed(0)}%</span>
      {/if}
    </div>
  {/if}
  <div class="progress-track" style="height: {height};">
    <div 
      class="progress-bar {colorClass} {stateClass}" 
      style="width: {percentage}%;"
    ></div>
  </div>
</div>

<style>
  .progress-container {
    margin-bottom: var(--space-md);
    width: 100%;
  }
  
  .progress-label {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-xs);
    font-size: 0.9rem;
    color: var(--text-secondary);
  }
  
  .progress-percentage {
    font-weight: 600;
  }
  
  .progress-track {
    width: 100%;
    background-color: var(--secondary);
    border-radius: 999px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
    background-color: var(--primary);
  }
  
  /* Variantes */
  .progress-success {
    background-color: var(--success);
  }
  
  .progress-warning {
    background-color: var(--warning);
  }
  
  .progress-error {
    background-color: var(--error);
  }
  
  /* Estados */
  .progress-complete {
    background-color: var(--success);
  }
</style>
