<script lang="ts">
  import Button from '../common/Button.svelte';
  import { onMount } from 'svelte';

  // Defino la interfaz completa del plan
  export let plan: {
    plan_name: string | null;
    credits: number | null;
    is_active: boolean;
    developer?: boolean;
    is_developer?: boolean;
    dev_plan_active?: boolean;
  } | null = null;

  // Estado reactivo para la clave de API
  let hasApiKey = false;
  $: hasApiKey; // Asegura la reactividad del estado

  // Diagnóstico del plan
  $: {
    if (plan) {
      console.log('PlanStatus recibiendo:', plan);
      console.log('¿Es desarrollador?:', plan.is_developer || plan.developer);
      console.log('¿Plan dev activo?:', plan.dev_plan_active);
      console.log(
        '¿Se cumple la condición de mostrar plan dev?:',
        (plan.developer || plan.is_developer) && plan.dev_plan_active,
      );
    }
  }

  function checkApiKey() {
    hasApiKey = typeof localStorage !== 'undefined' && !!localStorage.getItem('openai_api_key');
  }

  onMount(() => {
    // Verificar la clave al montar
    checkApiKey();
    // Escuchar cambios en localStorage
    window.addEventListener('storage', checkApiKey);
    // Verificar periódicamente por si acaso
    const interval = setInterval(checkApiKey, 2000);
    return () => {
      window.removeEventListener('storage', checkApiKey);
      clearInterval(interval);
    };
  });

  function removeApiKey() {
    localStorage.removeItem('openai_api_key');
    checkApiKey();
    alert('Clave API eliminada correctamente');
  }
</script>

<!-- Contenido solo para depuración - lo comentamos para evitar errores -->

<!-- Barra de estado del plan -->
{#if plan}
  <div class="plan-status {plan.is_active ? '' : 'inactive'}">
    {#if (plan.developer || plan.is_developer) && plan.dev_plan_active}
      <div class="plan-title" style="color:#1a7f37;">
        Plan: <b>{plan.plan_name || 'Desarrollador LukaLibre'}</b>
        <span style="font-size:0.92em; color:#1a7f37;">(dev)</span>
      </div>
      <div class="plan-credits" style="color: #1a7f37;">Créditos restantes: <b>ilimitados</b></div>
    {:else if (plan.developer || plan.is_developer) && plan.dev_plan_active === false}
      <div class="plan-title" style="color:#888;">
        Plan: <b>Desarrollador LukaLibre</b>
        <span style="font-size:0.92em; color:#888;">(dev inactivo)</span>
      </div>
      <div class="plan-credits" style="color: #aaa;">Créditos restantes: <b>0</b></div>
      <div class="inactive-msg">Plan de desarrollador desactivado</div>
    {:else}
      <div class="plan-title">Plan: <b>{plan.plan_name}</b></div>
      <div class="plan-credits" style="color: {plan.is_active ? '#222' : '#aaa'};">
        Créditos restantes: <b>{plan.credits}</b>
      </div>
      {#if !plan.is_active}
        <div class="inactive-msg">Plan inactivo</div>
      {/if}
    {/if}
  </div>
{:else}
  <div class="plan-status no-plan">
    <div class="plan-title" style="color:#aaa;">Sin plan</div>
    <div class="plan-credits" style="color:#ccc;">Créditos restantes: <b>0</b></div>
  </div>
{/if}

<style>
  .plan-status {
    background: #f4f4f4;
    border-radius: 8px;
    padding: 0.7rem 1rem;
    margin-bottom: 0.5rem;
    font-size: 1rem;
    color: #222;
    min-width: 200px;
  }
  .plan-status.inactive {
    background: #f7f7f7;
    color: #888;
    border: none;
  }
  .plan-status.no-plan {
    background: #f7f7f7;
    color: #bbb;
    border: none;
  }
  .plan-credits {
    margin-top: 0.4rem;
    font-size: 0.98em;
  }
  .inactive-msg {
    color: #888;
    font-size: 0.95em;
    margin-top: 0.3rem;
  }
  .plan-title {
    font-weight: 600;
  }
  .plan-credits {
    margin-top: 0.4rem;
  }

  /* Estos estilos se han eliminado porque no se usan actualmente */
</style>
