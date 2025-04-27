<script lang="ts">
  /**
   * Componente reutilizable de botón con varios estilos
   */
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
  export let icon = '';
  export let iconPosition: 'left' | 'right' = 'left';
  export let id = '';
  export let ariaLabel = '';
  export let dataCy = '';
  export let style: string = "";
  
  // Computed props
  $: classes = [
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    fullWidth ? 'btn-full-width' : '',
    loading ? 'btn-loading' : ''
  ].filter(Boolean).join(' ');
</script>

<button
  {id}
  type={type}
  class={classes}
  disabled={disabled || loading}
  aria-label={ariaLabel}
  data-cy={dataCy}
  style={style}
  on:click
  on:focus
  on:blur
  on:mouseover
  on:mouseenter
  on:mouseleave
>
  {#if loading}
    <span class="btn-loader"></span>
  {/if}
  
  {#if icon && iconPosition === 'left'}
    <span class="material-icons btn-icon btn-icon-left">{icon}</span>
  {/if}
  
  <span class="btn-text">
    <slot></slot>
  </span>
  
  {#if icon && iconPosition === 'right'}
    <span class="material-icons btn-icon btn-icon-right">{icon}</span>
  {/if}
</button>

<style>
  .btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: background-color 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    text-decoration: none;
    border: 2px solid transparent;
  }
  
  .btn:focus-visible {
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  
  .btn-primary {
    background-color: var(--primary);
    color: var(--primary-fg);
  }
  
  .btn-primary:hover {
    background-color: var(--primary-hover);
    color: var(--primary-fg);
  }
  
  .btn-secondary {
    background-color: var(--secondary);
    color: var(--secondary-fg);
  }
  
  .btn-secondary:hover {
    background-color: #e1e4e8;
    color: #212529;
  }
  
  .btn-outline {
    background-color: transparent;
    border-color: var(--primary);
    color: var(--primary);
  }
  
  .btn-outline:hover {
    background-color: var(--primary-hover-transparent);
  }
  
  .btn-ghost {
    background-color: transparent;
    color: var(--text-primary);
  }
  
  .btn-ghost:hover {
    background-color: var(--hover-bg);
  }
  
  .btn-danger {
    background-color: var(--danger);
    color: var(--danger-fg);
  }
  
  .btn-danger:hover {
    background-color: var(--danger-hover);
    color: var(--danger-fg);
  }
  
  .btn-sm {
    height: 32px;
    padding: 0 var(--space-md);
    font-size: 14px;
  }
  
  .btn-md {
    height: 40px;
    padding: 0 var(--space-lg);
    font-size: 16px;
  }
  
  .btn-lg {
    height: 48px;
    padding: 0 var(--space-xl);
    font-size: 16px;
  }
  
  .btn-full-width {
    width: 100%;
  }
  
  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .btn-loader {
    position: absolute;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: currentColor;
    animation: spin 0.8s linear infinite;
  }
  
  .btn-loading .btn-text {
    opacity: 0;
  }
  
  .btn-icon {
    display: inline-flex;
  }
  
  .btn-icon-left {
    margin-right: var(--space-sm);
  }
  
  .btn-icon-right {
    margin-left: var(--space-sm);
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style> 