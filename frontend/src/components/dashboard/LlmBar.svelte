<script lang="ts">
  import { onMount } from 'svelte';
  import ApiKeyModal from '../llm/ApiKeyModal.svelte';
  import PlanStatus from '../llm/PlanStatus.svelte';
  import { fetchUserPlan, type UserPlan } from '../../services/userPlanService';
  import Card from '../common/Card.svelte';
  import Button from '../common/Button.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import Icon from '../common/Icon.svelte';

  let apiKey = '';
  let hasApiKey = false;
  let showApiKeyModal = false;
  let plan: UserPlan | null = null;
  let planLoading = true;
  let infoMessage = '';

  function openApiKeyModal() {
    showApiKeyModal = true;
  }

  function handleApiKeySet(e: CustomEvent) {
    apiKey = e.detail.apiKey;
    showApiKeyModal = false;
    infoMessage = 'API Key configurada correctamente.';
    setTimeout(() => infoMessage = '', 3000);
  }

  function checkApiKey() {
    apiKey = localStorage.getItem('openai_api_key') || '';
    hasApiKey = !!apiKey;
    if (!apiKey) {
      showApiKeyModal = false;
    }
  }

  function removeApiKey() {
    localStorage.removeItem('openai_api_key');
    apiKey = '';
    hasApiKey = false;
    infoMessage = 'API Key eliminada correctamente.';
    setTimeout(() => infoMessage = '', 3000);
  }

  onMount(async () => {
    checkApiKey();
    planLoading = true;
    plan = await fetchUserPlan();
    console.log('Plan cargado:', plan);
    console.log('Es desarrollador:', plan?.is_developer, plan?.developer);
    console.log('Plan dev activo:', plan?.dev_plan_active);
    planLoading = false;
    // Mostrar modal si NO hay apiKey y NO hay plan activo con créditos
    if (!apiKey && (!plan || !plan.is_active || (plan.credits ?? 0) <= 0)) {
      showApiKeyModal = true;
    }
  });
</script>

<Card variant="outline" padding="md" radius="md" fullWidth={true}>
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 2rem; width: 100%; flex-wrap: wrap;">
    <div style="flex:1; min-width: 220px; margin-right: 0.5rem;">
      <div style="font-size: 0.95em; color: #555; margin-bottom: 0.3rem;">
        Puedes usar créditos incluidos con un plan o tu propia API Key de OpenAI.<br>
        Si no tienes un plan activo, deberás ingresar tu clave.
      </div>
      {#if planLoading}
        <span style="margin-left: 1rem;">Cargando plan...</span>
      {:else}
        <PlanStatus {plan} />
      {/if}
    </div>
    <div style="display: flex; gap: 0.5rem; align-self: flex-start;">
      {#if hasApiKey}
        <Button
          variant="danger"
          size="md"
          on:click={removeApiKey}
          style="min-width: 200px; background-color: #e74c3c; color: white; border: 1px solid #c0392b;"
        >
          <span style="display:inline-flex; align-items:center;">
            <span style="margin-right:4px;">🔑</span> Eliminar clave API
          </span>
        </Button>
      {/if}
      <Button
        variant="primary"
        size="md"
        disabled={true}
        ariaLabel="Coming soon"
        style="min-width: 200px;"
      >
        <Icon name="cloud-check" size={18} style="margin-right: 0.5rem;" />
        Activar plan <span style="font-size:0.9em; color:#888;">(coming soon)</span>
      </Button>
    </div>
  </div>
  <ApiKeyModal visible={showApiKeyModal} on:setApiKey={handleApiKeySet} />
  {#if infoMessage}
    <StatusMessage type="info" message={infoMessage} onClose={() => infoMessage = ''} />
  {/if}
</Card>


<style>

</style>
