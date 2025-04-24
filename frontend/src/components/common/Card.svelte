<script lang="ts">
  export let variant: 'default' | 'outline' | 'filled' = 'default';
  export let padding: 'sm' | 'md' | 'lg' | 'none' = 'md';
  export let radius: 'sm' | 'md' | 'lg' | 'none' = 'md';
  export let elevated: boolean = false;
  export let fullWidth: boolean = false;
  export let interactive: boolean = false;
  export let hoverable: boolean = false;
  
  // Classes
  $: classes = [
    'card',
    `card-${variant}`,
    elevated ? 'card-elevated' : '',
    fullWidth ? 'card-full-width' : '',
    interactive ? 'card-interactive' : '',
    hoverable ? 'card-hoverable' : '',
    `padding-${padding}`,
    `radius-${radius}`
  ].filter(Boolean).join(' ');
</script>

<div class={classes} on:click>
  <slot></slot>
</div>

<style>
  .card {
    position: relative;
    background-color: var(--card-bg, var(--background-primary));
    transition: box-shadow 0.2s, transform 0.2s, background-color 0.2s;
  }
  
  /* Variants */
  .card-outline {
    border: 1px solid var(--border-color);
  }
  
  .card-filled {
    background-color: var(--background-secondary);
  }
  
  .card-elevated {
    box-shadow: var(--shadow-sm);
  }
  
  /* Padding options */
  .padding-none {
    padding: 0;
  }
  
  .padding-sm {
    padding: var(--space-sm);
  }
  
  .padding-md {
    padding: var(--space-md);
  }
  
  .padding-lg {
    padding: var(--space-lg);
  }
  
  /* Border radius options */
  .radius-none {
    border-radius: 0;
  }
  
  .radius-sm {
    border-radius: var(--radius-sm);
  }
  
  .radius-md {
    border-radius: var(--radius-md);
  }
  
  .radius-lg {
    border-radius: var(--radius-lg);
  }
  
  /* Width */
  .card-full-width {
    width: 100%;
  }
  
  /* Interactive card */
  .card-interactive {
    cursor: pointer;
  }
  
  .card-interactive:focus {
    outline: none;
    box-shadow: 0 0 0 2px var(--focus-ring);
  }
  
  /* Hoverable */
  .card-hoverable:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
</style> 