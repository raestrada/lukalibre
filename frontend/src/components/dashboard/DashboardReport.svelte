<script lang="ts">
  import { createLogger } from '../../utils/logger';
  import Button from '../common/Button.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import Card from '../common/Card.svelte';
  import Icon from '../common/Icon.svelte';
  import { generateDashboardReport } from '../../services/dashboardService';
  import { onMount } from 'svelte';
  
  const log = createLogger('DashboardReport');
  
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;
  let reportHTML: string | null = null;
  let lastReportDate: string | null = null;

  const LS_REPORT_KEY = 'dashboard_last_report_html';
  const LS_REPORT_DATE_KEY = 'dashboard_last_report_date';

  onMount(() => {
    const cached = localStorage.getItem(LS_REPORT_KEY);
    const cachedDate = localStorage.getItem(LS_REPORT_DATE_KEY);
    if (cached) {
      reportHTML = cached;
      lastReportDate = cachedDate;
    }
  });
  
  async function handleGenerateReport() {
    loading = true;
    error = null;
    success = null;
    reportHTML = null;
    
    try {
      reportHTML = await generateDashboardReport();
      const now = new Date();
      lastReportDate = now.toISOString();
      localStorage.setItem(LS_REPORT_KEY, reportHTML);
      localStorage.setItem(LS_REPORT_DATE_KEY, lastReportDate);
      success = 'Reporte generado correctamente';
    } catch (err: any) {
      error = `Error al generar el reporte: ${err.message}`;
      log.error('Error generando reporte:', err);
    } finally {
      loading = false;
    }
  }
  
  function clearReport() {
    reportHTML = null;
    lastReportDate = null;
    localStorage.removeItem(LS_REPORT_KEY);
    localStorage.removeItem(LS_REPORT_DATE_KEY);
    success = null;
    error = null;
  }
</script>

<div class="dashboard-report">
  <Card>
  <div class="card-title">
    <Icon icon="assessment" />
    <span>Dashboard Financiero</span>
    {#if lastReportDate}
      <span class="last-report-badge">
        <span class="material-icons" style="font-size:1em;vertical-align:middle;">event</span>
        Último reporte: {new Date(lastReportDate).toLocaleString('es-CL')}
      </span>
    {/if}
  </div>
  <div class="card-content">
    <p class="description">
      Genera un reporte personalizado con análisis completo de tus finanzas, metas, 
      recomendaciones automáticas y alertas específicas para Chile.
    </p>
    {#if error}
      <StatusMessage type="error" message={error} />
    {/if}
    {#if success}
      <StatusMessage type="success" message={success} />
    {/if}
    <div class="actions">
      <Button
        on:click={handleGenerateReport}
        disabled={loading}
        {loading}
        icon="analytics"
        variant="primary"
      >
        {loading ? 'Generando...' : 'Generar Reporte'}
      </Button>
      {#if reportHTML}
        <Button
          on:click={clearReport}
          icon="clear"
          variant="secondary"
        >
          Limpiar
        </Button>
      {/if}
    </div>
  </div>
</Card>
  
  {#if reportHTML}
    <div class="report-container">
      <Card>
        <div class="card-title">
          <Icon icon="auto_awesome" />
          <span>Reporte Financiero</span>
        </div>
        <div class="card-content">
          <!-- svelte-ignore a11y-inner-html -->
          <div class="report-content">
            {@html reportHTML}
          </div>
        </div>
      </Card>
    </div>
  {/if}
</div>

<style>
  .dashboard-report {
    width: 100%;
    margin-bottom: var(--space-xl);
  }
  .dashboard-report, .dashboard-report * {
    color: #222 !important;
  }
  .card-title, .card-content {
    color: #222 !important;
    background: #fff !important;
  }
  .dashboard-report button {
    color: #fff !important;
    background: #007bff !important;
    border: 1px solid #007bff !important;
  }
  .dashboard-report .card-title span, .dashboard-report .card-title {
    font-weight: 600;
    font-size: 1.15em;
  }
  
  .description {
    margin-bottom: var(--space-md);
    color: var(--color-text-secondary);
  }
  
  .actions {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
  }
  
  .report-container {
    margin-top: var(--space-md);
  }
  
  .report-content {
    padding: var(--space-md);
    overflow: auto;
    max-height: 80vh;
  }
  
  /* Estilos básicos para los componentes generados por el LLM */
  :global(.dashboard-card) {
    border: 1px solid var(--color-border);
    border-radius: var(--border-radius);
    padding: var(--space-md);
    margin-bottom: var(--space-md);
    background-color: var(--color-background-card);
  }
  
  :global(.dashboard-title) {
    font-size: 1.2rem;
    font-weight: 600;
    margin-bottom: var(--space-md);
    color: var(--color-primary);
  }
  
  :global(.dashboard-alert) {
    border-radius: var(--border-radius);
    padding: var(--space-sm);
    margin-bottom: var(--space-md);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  :global(.alert-verde) {
    background-color: rgba(67, 160, 71, 0.1);
    border-left: 4px solid #43a047;
  }
  
  :global(.alert-rojo) {
    background-color: rgba(229, 57, 53, 0.1);
    border-left: 4px solid #e53935;
  }
  
  :global(.alert-azul) {
    background-color: rgba(25, 118, 210, 0.1);
    border-left: 4px solid #1976d2;
  }
  
  :global(.chart) {
    height: 200px;
    background-color: var(--color-background-light);
    border-radius: var(--border-radius);
    margin-bottom: var(--space-md);
  }
.last-report-badge {
  display: inline-flex;
  align-items: center;
  background: #e3f0fc;
  color: #1565c0;
  border-radius: 8px;
  font-size: 0.93em;
  font-weight: 600;
  padding: 0.18em 0.85em 0.18em 0.5em;
  margin-left: 1em;
  box-shadow: 0 1px 4px rgba(25,118,210,0.07);
}
.last-report-badge .material-icons {
  margin-right: 0.35em;
  color: #1976d2;
}

</style>
