<script lang="ts">
  export let id: string = '';
  export let name: string = '';
  export let label: string = '';
  export let placeholder: string = '';
  export let value: string = '';
  export let type: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' = 'text';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let required: boolean = false;
  export let error: string = '';
  export let helper: string = '';
  export let fullWidth: boolean = false;
  export let icon: string = '';
  export let iconPosition: 'left' | 'right' = 'left';
  export let dataCy: string = '';

  // Clases combinadas
  $: containerClasses = [
    'input-container',
    `input-${size}`,
    fullWidth ? 'input-full-width' : '',
    error ? 'input-error' : '',
    icon ? `input-with-icon input-icon-${iconPosition}` : '',
  ]
    .filter(Boolean)
    .join(' ');
</script>

<div class={containerClasses}>
  {#if label}
    <label for={id} class="input-label">
      {label}
      {#if required}
        <span class="input-required">*</span>
      {/if}
    </label>
  {/if}

  <div class="input-wrapper">
    {#if icon && iconPosition === 'left'}
      <span class="input-icon input-icon-left">{icon}</span>
    {/if}

    <input
      {id}
      {name}
      {type}
      {placeholder}
      bind:value
      {disabled}
      {readonly}
      {required}
      aria-invalid={!!error}
      aria-describedby={`${id}-error ${id}-helper`}
      data-cy={dataCy}
      on:blur
      on:focus
      on:input
      on:change
    />

    {#if icon && iconPosition === 'right'}
      <span class="input-icon input-icon-right">{icon}</span>
    {/if}
  </div>

  {#if error}
    <div class="input-message input-error-message" id={`${id}-error`}>
      {error}
    </div>
  {:else if helper}
    <div class="input-message input-helper-message" id={`${id}-helper`}>
      {helper}
    </div>
  {/if}
</div>

<style>
  .input-container {
    display: flex;
    flex-direction: column;
    margin-bottom: var(--space-md);
  }

  .input-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: var(--space-xs);
  }

  .input-required {
    color: var(--danger);
    margin-left: 2px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background-color: var(--input-bg, var(--background-primary));
    color: var(--text-primary);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
    font-family: inherit;
  }

  input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--focus-ring);
  }

  input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background-color: var(--background-disabled);
  }

  input::placeholder {
    color: var(--text-placeholder);
  }

  .input-sm input {
    height: 32px;
    padding: 0 var(--space-md);
    font-size: 0.875rem;
  }

  .input-md input {
    height: 40px;
    padding: 0 var(--space-md);
    font-size: 1rem;
  }

  .input-lg input {
    height: 48px;
    padding: 0 var(--space-lg);
    font-size: 1rem;
  }

  .input-full-width {
    width: 100%;
  }

  /* Error state */
  .input-error input {
    border-color: var(--danger);
  }

  .input-error input:focus {
    box-shadow: 0 0 0 2px var(--danger-transparent);
  }

  .input-message {
    font-size: 0.75rem;
    margin-top: var(--space-xs);
  }

  .input-error-message {
    color: var(--danger);
  }

  .input-helper-message {
    color: var(--text-secondary);
  }

  /* Icon handling */
  .input-with-icon.input-icon-left input {
    padding-left: calc(var(--space-lg) + 20px);
  }

  .input-with-icon.input-icon-right input {
    padding-right: calc(var(--space-lg) + 20px);
  }

  .input-icon {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
  }

  .input-icon-left {
    left: var(--space-md);
  }

  .input-icon-right {
    right: var(--space-md);
  }
</style>
