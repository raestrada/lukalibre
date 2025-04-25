<script lang="ts">
  export let type: 'success' | 'error' | 'warning' | 'info' = 'info';
  export let message: string = '';
  export let closable: boolean = true;
  export let onClose: () => void = () => {};
  export let actions: {label: string, onClick: () => void, disabled?: boolean, loading?: boolean}[] = [];
</script>

<div class="status-message {type}-message">
  <div class="message-content">
    <p>{message}</p>
    
    {#if actions.length > 0}
      <div class="message-actions">
        {#each actions as action}
          <button 
            class="message-button {type}"
            on:click={action.onClick}
            disabled={action.disabled || false}
          >
            {#if action.loading}
              <span class="loading-spinner"></span> 
            {/if}
            {action.label}
          </button>
        {/each}
      </div>
    {/if}
    
    {#if closable}
      <button class="close-button" on:click={onClose}>&times;</button>
    {/if}
  </div>
  
  <!-- Permitimos incluir contenido personalizado si es necesario -->
  <slot></slot>
</div>

<style>
  .status-message {
    padding: 0.75rem 1rem;
    border-radius: 4px;
    margin: 1rem 0;
    display: flex;
    flex-direction: column;
  }

  .message-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  p {
    margin: 0;
    flex-grow: 1;
  }

  .success-message {
    background: #4caf50;
    color: white;
    border-left: 4px solid #2e7d32;
  }

  .error-message {
    background: #f44336;
    color: white;
    border-left: 4px solid #b71c1c;
  }

  .warning-message {
    background: #fff3cd;
    color: #856404;
    border-left: 4px solid #ffc107;
  }

  .info-message {
    background: #e3f2fd;
    color: #0d47a1;
    border-left: 4px solid #2196f3;
  }

  .close-button {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0 0.5rem;
    opacity: 0.7;
    margin-left: 0.5rem;
    transition: opacity 0.2s;
  }

  .close-button:hover {
    opacity: 1;
  }

  .message-actions {
    display: flex;
    gap: 0.5rem;
    margin-left: auto;
  }

  .message-button {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .message-button.success {
    background-color: #28a745;
    color: white;
  }

  .message-button.error {
    background-color: #dc3545;
    color: white;
  }

  .message-button.warning {
    background-color: #ffc107;
    color: #212529;
  }

  .message-button.info {
    background-color: #17a2b8;
    color: white;
  }

  .message-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .loading-spinner {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: spin 0.75s linear infinite;
    margin-right: 0.25rem;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
