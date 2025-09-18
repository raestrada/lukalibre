<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { onMount } from 'svelte';
  const dispatch = createEventDispatcher();

  let provider = 'openrouter';
  let apiKey = '';
  let saveInStorage = false;
  let showWarning = false;

  export let visible = false;

  // Load from localStorage if exists
  onMount(() => {
    const storedOpenAI = localStorage.getItem('openai_api_key');
    const storedOpenRouter = localStorage.getItem('openrouter_api_key');
    const storedProvider = localStorage.getItem('preferred_llm_provider');

    if (storedProvider) {
      provider = storedProvider;
    }

    if (provider === 'openai' && storedOpenAI) {
      apiKey = storedOpenAI;
      saveInStorage = true;
    } else if (provider === 'openrouter' && storedOpenRouter) {
      apiKey = storedOpenRouter;
      saveInStorage = true;
    }
  });

  function onProviderChange() {
    // Load existing key for the selected provider
    const stored = localStorage.getItem(`${provider}_api_key`);
    if (stored) {
      apiKey = stored;
      saveInStorage = true;
    } else {
      apiKey = '';
      saveInStorage = false;
    }
  }

  function submit() {
    if (saveInStorage) {
      localStorage.setItem(`${provider}_api_key`, apiKey);
      localStorage.setItem('preferred_llm_provider', provider);
    } else {
      localStorage.removeItem(`${provider}_api_key`);
    }
    dispatch('setApiKey', { apiKey, provider });
  }

  $: showWarning = saveInStorage && apiKey.length > 0;
</script>

{#if visible}
  <div class="modal-backdrop">
    <div class="modal">
      <h2>Configura tu clave de API</h2>
      <p>
        Introduce tu API key para hacer llamadas directas desde el navegador. Nunca será enviada a
        nuestro servidor.
      </p>

      <div class="provider-selection">
        <label>Proveedor de IA:</label>
        <select bind:value={provider} on:change={onProviderChange}>
          <option value="openrouter">OpenRouter (Recomendado - Acceso a múltiples modelos)</option>
          <option value="openai">OpenAI (Directo)</option>
        </select>
      </div>

      <input
        type="password"
        bind:value={apiKey}
        placeholder={provider === 'openrouter' ? 'sk-or-v1-...' : 'sk-...'}
      />

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

      <div class="info">
        {#if provider === 'openrouter'}
          <p>
            <strong>OpenRouter:</strong> Acceso optimizado por costo a GPT-4, Claude, Gemini y más
            modelos.
            <a href="https://openrouter.ai/" target="_blank">Obtener clave API</a>
          </p>
        {:else}
          <p>
            <strong>OpenAI:</strong> Acceso directo a modelos GPT.
            <a href="https://platform.openai.com/api-keys" target="_blank">Obtener clave API</a>
          </p>
        {/if}
      </div>

      <div class="actions">
        <button on:click={submit} disabled={!apiKey}>Guardar y continuar</button>
      </div>
    </div>
  </div>
{/if}

<style>
  /* LukaLibre Colors */
  :root {
    --verde-luka: #3a6351;
    --verde-nube: #d5e5d9;
    --negro-callado: #222222;
    --amarillo-caleta: #ffc857;
    --blanco-panraza: #f9f9f9;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(58, 99, 81, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: var(--blanco-panraza);
    color: var(--negro-callado);
    padding: 2rem;
    border-radius: 12px;
    max-width: 480px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(58, 99, 81, 0.15);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    border: 1px solid var(--verde-nube);
  }

  .modal h2 {
    color: var(--verde-luka);
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    text-align: center;
  }

  .modal p {
    color: #555;
    margin: 0;
    font-size: 1rem;
    line-height: 1.5;
    text-align: center;
  }

  .provider-selection {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .provider-selection label {
    font-weight: 600;
    color: var(--negro-callado);
    font-size: 1rem;
  }

  select {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border-radius: 8px;
    border: 2px solid var(--verde-nube);
    background: white;
    color: var(--negro-callado);
    transition: border-color 0.2s ease;
  }

  select:focus {
    outline: none;
    border-color: var(--verde-luka);
    box-shadow: 0 0 0 3px rgba(58, 99, 81, 0.1);
  }

  input[type='password'] {
    width: 100%;
    padding: 0.75rem;
    font-size: 1rem;
    border-radius: 8px;
    border: 2px solid var(--verde-nube);
    background: white;
    color: var(--negro-callado);
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  }

  input[type='password']:focus {
    outline: none;
    border-color: var(--verde-luka);
    box-shadow: 0 0 0 3px rgba(58, 99, 81, 0.1);
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1rem;
    color: var(--negro-callado);
    margin: 0.5rem 0;
  }

  .checkbox input[type='checkbox'] {
    width: auto;
    margin: 0;
    transform: scale(1.2);
    accent-color: var(--verde-luka);
  }

  .warning {
    background: #fff3cd;
    color: #856404;
    border-radius: 8px;
    padding: 1rem;
    font-size: 0.95rem;
    border: 1px solid #ffeeba;
    line-height: 1.4;
  }

  .info {
    background: var(--verde-nube);
    border-radius: 8px;
    padding: 1rem;
    font-size: 0.95rem;
    color: var(--negro-callado);
    border: 1px solid rgba(58, 99, 81, 0.2);
    line-height: 1.4;
  }

  .info a {
    color: var(--verde-luka);
    text-decoration: none;
    font-weight: 600;
  }

  .info a:hover {
    text-decoration: underline;
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-top: 0.5rem;
  }

  button {
    background: var(--verde-luka);
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0.75rem 2rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(58, 99, 81, 0.2);
    min-width: 200px;
  }

  button:hover:not(:disabled) {
    background: #2d4f3d;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(58, 99, 81, 0.3);
  }

  button:disabled {
    background: #ccc;
    color: #888;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
</style>
