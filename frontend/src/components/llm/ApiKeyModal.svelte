<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  let apiKey = '';
  let saveInStorage = false;
  let showWarning = false;

  export let visible = false;

  // Cargar de localStorage si existe
  onMount(() => {
    const stored = localStorage.getItem('openai_api_key');
    if (stored) {
      apiKey = stored;
      saveInStorage = true;
    }
  });

  function submit() {
    if (saveInStorage) {
      localStorage.setItem('openai_api_key', apiKey);
    } else {
      localStorage.removeItem('openai_api_key');
    }
    dispatch('setApiKey', { apiKey });
  }

  $: showWarning = saveInStorage && apiKey.length > 0;
</script>

{#if visible}
  <div class="modal-backdrop">
    <div class="modal">
      <h2>Configura tu clave de OpenAI</h2>
      <p>Introduce tu API key de OpenAI. Nunca será enviada a nuestro servidor.</p>
      <input type="password" bind:value={apiKey} placeholder="sk-..." />
      <label class="checkbox">
        <input type="checkbox" bind:checked={saveInStorage} />
        Guardar en este navegador
      </label>
      {#if showWarning}
        <div class="warning">
          ⚠️ Tu clave se almacenará localmente en este navegador.<br />
          <b>Advertencia:</b> Cualquier persona con acceso a este navegador podrá ver la clave en
          texto plano en el almacenamiento local.<br />
          No marques esta opción en computadores compartidos o públicos.
        </div>
      {/if}
      <div class="actions">
        <button on:click={submit} disabled={!apiKey}>Guardar y continuar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .modal {
    background: #fff;
    color: var(--text-primary);
    padding: var(--space-xl);
    border-radius: var(--radius-lg);
    max-width: 400px;
    width: 100%;
    box-shadow: 0 4px 32px var(--shadow);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .modal h2 {
    color: var(--primary);
    margin-bottom: var(--space-sm);
    font-size: 1.4rem;
    font-weight: 700;
  }
  .modal p {
    color: #444;
    margin-bottom: var(--space-sm);
    font-size: 1rem;
  }
  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.98rem;
    color: var(--text-primary);
  }
  .warning {
    background: var(--warning, #fff3cd);
    color: #856404;
    border-radius: var(--radius-md);
    padding: 0.5rem;
    font-size: 0.98rem;
    margin-top: -0.5rem;
    border: 1px solid #ffeeba;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
  }
  input[type='password'] {
    width: 100%;
    padding: 0.5rem;
    font-size: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--border);
    background: var(--secondary);
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
  }
  button {
    background: var(--primary);
    color: #fff;
    border: none;
    border-radius: var(--radius-md);
    padding: 0.5rem 1.2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    box-shadow: 0 2px 8px var(--shadow, rgba(0, 0, 0, 0.08));
  }
  button:disabled {
    background: var(--border);
    color: var(--text-secondary);
    cursor: not-allowed;
  }
</style>
