<script lang="ts">
  import { createLogger } from '../../utils/logger';
  import Button from '../common/Button.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import Card from '../common/Card.svelte';
  import Icon from '../common/Icon.svelte';
  import Tabs from '../common/Tabs.svelte';
  import FinancialReport from './FinancialReport.svelte';
  import FinancialBalance from './FinancialBalance.svelte';
  import FinancialRecommendations from './FinancialRecommendations.svelte';
  import { generateDashboardReport, generateFinancialBalance, generateFinancialRecommendations } from '../../services/dashboardService';
  import { onMount } from 'svelte';

  const log = createLogger('DashboardReport');

  // Estado del reporte, balance y recomendaciones
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;
  let reportData: any = null;
  let balanceData: any = null;
  let recommendationsData: any = null;
  let lastReportDate: string | null = null;
  let lastBalanceDate: string | null = null;
  let lastRecommendationsDate: string | null = null;

  // Tabs disponibles
  type Tab = 'reporte' | 'balance' | 'recomendaciones' | 'alertas' | 'chat';
  let activeTab: Tab = 'reporte';

  // Info para localStorage
  const LS_REPORT_KEY = 'dashboard_last_report_data';
  const LS_REPORT_DATE_KEY = 'dashboard_last_report_date';
  const LS_BALANCE_KEY = 'dashboard_last_balance_data';
  const LS_BALANCE_DATE_KEY = 'dashboard_last_balance_date';
  const LS_RECOMMENDATIONS_KEY = 'dashboard_last_recommendations_data';
  const LS_RECOMMENDATIONS_DATE_KEY = 'dashboard_last_recommendations_date';

  // Configuración de las tabs
  const tabs: Array<{id: Tab, label: string, name: string}> = [
    { id: 'reporte', label: 'Reporte', name: 'assessment' },
    { id: 'balance', label: 'Balance', name: 'account_balance' },
    { id: 'recomendaciones', label: 'Recomendaciones', name: 'tips_and_updates' },
    { id: 'alertas', label: 'Alertas', name: 'notifications' },
    { id: 'chat', label: 'Chat', name: 'chat' }
  ];

  // Cambiar de tab
  function setActiveTab(tabId: string) {
    activeTab = tabId as Tab;
  }

  onMount(() => {
    // Cargar datos del reporte
    const cachedReport = localStorage.getItem(LS_REPORT_KEY);
    const cachedReportDate = localStorage.getItem(LS_REPORT_DATE_KEY);
    if (cachedReport) {
      try {
        reportData = JSON.parse(cachedReport);
        lastReportDate = cachedReportDate;
      } catch (err) {
        log.error('Error al parsear datos del reporte almacenados:', err);
        localStorage.removeItem(LS_REPORT_KEY);
        localStorage.removeItem(LS_REPORT_DATE_KEY);
      }
    }
    
    // Cargar datos del balance
    const cachedBalance = localStorage.getItem(LS_BALANCE_KEY);
    const cachedBalanceDate = localStorage.getItem(LS_BALANCE_DATE_KEY);
    if (cachedBalance) {
      try {
        balanceData = JSON.parse(cachedBalance);
        lastBalanceDate = cachedBalanceDate;
      } catch (err) {
        log.error('Error al parsear datos del balance almacenados:', err);
        localStorage.removeItem(LS_BALANCE_KEY);
        localStorage.removeItem(LS_BALANCE_DATE_KEY);
      }
    }
    
    // Cargar datos de recomendaciones
    const cachedRecommendations = localStorage.getItem(LS_RECOMMENDATIONS_KEY);
    const cachedRecommendationsDate = localStorage.getItem(LS_RECOMMENDATIONS_DATE_KEY);
    if (cachedRecommendations) {
      try {
        recommendationsData = JSON.parse(cachedRecommendations);
        lastRecommendationsDate = cachedRecommendationsDate;
      } catch (err) {
        log.error('Error al parsear datos de recomendaciones almacenados:', err);
        localStorage.removeItem(LS_RECOMMENDATIONS_KEY);
        localStorage.removeItem(LS_RECOMMENDATIONS_DATE_KEY);
      }
    }
  });

  async function handleGenerateReport() {
    loading = true;
    error = null;
    success = null;
    try {
      reportData = await generateDashboardReport();
      // Guardar la fecha en ISO string para asegurar compatibilidad
      const now = new Date();
      lastReportDate = now.toISOString();
      localStorage.setItem(LS_REPORT_KEY, JSON.stringify(reportData));
      localStorage.setItem(LS_REPORT_DATE_KEY, lastReportDate);
      success = 'Reporte generado exitosamente';
    } catch (err) {
      log.error('Error al generar reporte:', err);
      error = `Error al generar reporte: ${err}`;
    } finally {
      loading = false;
    }
  }
  
  function clearErrorMessage() {
    error = null;
  }
  
  function clearSuccessMessage() {
    success = null;
  }
  
  async function handleGenerateBalance() {
    loading = true;
    error = null;
    success = null;
    try {
      balanceData = await generateFinancialBalance();
      // Guardar la fecha en ISO string para asegurar compatibilidad
      const now = new Date();
      lastBalanceDate = now.toISOString();
      localStorage.setItem(LS_BALANCE_KEY, JSON.stringify(balanceData));
      localStorage.setItem(LS_BALANCE_DATE_KEY, lastBalanceDate);
      success = 'Balance financiero generado exitosamente';
    } catch (err) {
      log.error('Error al generar balance financiero:', err);
      error = `Error al generar balance financiero: ${err}`;
    } finally {
      loading = false;
    }
  }

  async function handleGenerateRecommendations() {
    loading = true;
    error = null;
    success = null;
    try {
      recommendationsData = await generateFinancialRecommendations();
      // Guardar la fecha en ISO string para asegurar compatibilidad
      const now = new Date();
      lastRecommendationsDate = now.toISOString();
      localStorage.setItem(LS_RECOMMENDATIONS_KEY, JSON.stringify(recommendationsData));
      localStorage.setItem(LS_RECOMMENDATIONS_DATE_KEY, lastRecommendationsDate);
      success = 'Recomendaciones financieras generadas exitosamente';
    } catch (err) {
      log.error('Error al generar recomendaciones financieras:', err);
      error = `Error al generar recomendaciones financieras: ${err}`;
    } finally {
      loading = false;
    }
  }

  function clearReport() {
    reportData = null;
    lastReportDate = null;
    localStorage.removeItem(LS_REPORT_KEY);
    localStorage.removeItem(LS_REPORT_DATE_KEY);
    success = null;
    error = null;
  }
  
  function clearBalance() {
    balanceData = null;
    lastBalanceDate = null;
    localStorage.removeItem(LS_BALANCE_KEY);
    localStorage.removeItem(LS_BALANCE_DATE_KEY);
    success = null;
    error = null;
  }
  
  function clearRecommendations() {
    recommendationsData = null;
    lastRecommendationsDate = null;
    localStorage.removeItem(LS_RECOMMENDATIONS_KEY);
    localStorage.removeItem(LS_RECOMMENDATIONS_DATE_KEY);
    success = null;
    error = null;
  }
</script>

<div class="dashboard-report">
  <Card>
    <div class="card-title">
      <Icon name="dashboard" />
      <span>Dashboard Financiero</span>
    </div>
    
    <!-- Barra de tabs usando el componente común -->
    <Tabs 
      {tabs} 
      {activeTab} 
      onTabChange={setActiveTab} 
    />
    
    <!-- Contenido según la tab activa -->
    <div class="tab-content">
      <!-- Tab de Reporte -->
      {#if activeTab === 'reporte'}
        <div class="card-content">
          <p class="description">
            Genera un reporte personalizado con análisis completo de tus finanzas, metas, 
            recomendaciones automáticas y alertas específicas para Chile.
          </p>
          {#if error}
            <StatusMessage type="error" message={error} onClose={clearErrorMessage} />
          {/if}
          {#if success}
            <StatusMessage type="success" message={success} onClose={clearSuccessMessage} />
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
            {#if reportData}
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
      
      <!-- Tab de Balance -->
      {:else if activeTab === 'balance'}
        <div class="card-content">
          <p class="description">
            Genera un balance detallado con análisis de activos, pasivos y patrimonio neto, 
            ratios financieros y recomendaciones específicas para Chile.
          </p>
          {#if error}
            <StatusMessage type="error" message={error} onClose={clearErrorMessage} />
          {/if}
          {#if success}
            <StatusMessage type="success" message={success} onClose={clearSuccessMessage} />
          {/if}
          <div class="actions">
            <Button
              on:click={handleGenerateBalance}
              disabled={loading}
              {loading}
              icon="account_balance"
              variant="primary"
            >
              {loading ? 'Generando...' : 'Generar Balance'}
            </Button>
            {#if balanceData}
              <Button
                on:click={clearBalance}
                icon="clear"
                variant="secondary"
              >
                Limpiar
              </Button>
            {/if}
          </div>
        </div>
      
      <!-- Tab de Recomendaciones -->
      {:else if activeTab === 'recomendaciones'}
        <div class="card-content">
          <p class="description">
            Genera recomendaciones financieras personalizadas basadas en tus datos, con análisis
            de patrones de gasto, oportunidades de ahorro y consejos específicos para Chile.
          </p>
          {#if error}
            <StatusMessage type="error" message={error} onClose={clearErrorMessage} />
          {/if}
          {#if success}
            <StatusMessage type="success" message={success} onClose={clearSuccessMessage} />
          {/if}
          <div class="actions">
            <Button
              on:click={handleGenerateRecommendations}
              disabled={loading}
              {loading}
              icon="tips_and_updates"
              variant="primary"
            >
              {loading ? 'Generando...' : 'Generar Recomendaciones'}
            </Button>
            {#if recommendationsData}
              <Button
                on:click={clearRecommendations}
                icon="clear"
                variant="secondary"
              >
                Limpiar
              </Button>
            {/if}
          </div>
        </div>
      {:else if activeTab === 'alertas'}
        <div class="card-content coming-soon">
          <div class="coming-soon-content">
            <Icon name="hourglass_empty" />
            <h3>Alertas - Próximamente</h3>
            <p>Te notificaremos sobre situaciones que requieran tu atención, como pagos próximos o gastos excesivos.</p>
          </div>
        </div>
      
      <!-- Tab de Chat -->
      {:else if activeTab === 'chat'}
        <div class="card-content coming-soon">
          <div class="coming-soon-content">
            <Icon name="hourglass_empty" />
            <h3>Chat Financiero - Próximamente</h3>
            <p>Consulta a nuestro asistente IA sobre cualquier duda financiera específica para el contexto chileno.</p>
          </div>
        </div>
      {/if}
    </div>
  </Card>
  
  <!-- Contenido del reporte (solo visible cuando hay un reporte generado y estamos en la tab de reporte) -->
  {#if reportData && activeTab === 'reporte'}
    <div class="report-container">
      <Card>
        <div class="card-title">
          <Icon name="auto_awesome" />
          <span>Reporte Financiero</span>
          {#if lastReportDate}
            <span class="last-report-badge">
              <span class="material-icons" style="font-size:1em;vertical-align:middle;">event</span>
              Último reporte: {new Date(lastReportDate).toLocaleString('es-CL', {dateStyle: 'medium', timeStyle: 'short'})}
            </span>
          {/if}
        </div>
        <div class="card-content">
          <div class="report-content">
            <FinancialReport reportData={reportData} />
          </div>
        </div>
      </Card>
    </div>
  {/if}
  
  <!-- Contenido del balance (solo visible cuando hay un balance generado y estamos en la tab de balance) -->
  {#if balanceData && activeTab === 'balance'}
    <div class="report-container">
      <Card>
        <div class="card-title">
          <Icon name="account_balance" />
          <span>Balance Financiero</span>
          {#if lastBalanceDate}
            <span class="last-report-badge">
              <span class="material-icons" style="font-size:1em;vertical-align:middle;">event</span>
              Último balance: {new Date(lastBalanceDate).toLocaleString('es-CL', {dateStyle: 'medium', timeStyle: 'short'})}
            </span>
          {/if}
        </div>
        <div class="card-content">
          <div class="report-content">
            <FinancialBalance balanceData={balanceData} />
          </div>
        </div>
      </Card>
    </div>
  {/if}
  
  <!-- Contenido de recomendaciones (solo visible cuando hay recomendaciones generadas y estamos en la tab de recomendaciones) -->
  {#if recommendationsData && activeTab === 'recomendaciones'}
    <div class="report-container">
      <Card>
        <div class="card-title">
          <Icon name="tips_and_updates" />
          <span>Recomendaciones Financieras</span>
          {#if lastRecommendationsDate}
            <span class="last-report-badge">
              <span class="material-icons" style="font-size:1em;vertical-align:middle;">event</span>
              Últimas recomendaciones: {new Date(lastRecommendationsDate).toLocaleString('es-CL', {dateStyle: 'medium', timeStyle: 'short'})}
            </span>
          {/if}
        </div>
        <div class="card-content">
          <div class="report-content">
            <FinancialRecommendations recommendationsData={recommendationsData} />
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
    color: var(--text-primary) !important;
  }
  .card-title, .card-content {
    color: var(--text-primary) !important;
    background: #fff !important;
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

/* Estos estilos fueron movidos al componente Tabs.svelte */

/* Estilos para el contenido de próximamente */
.coming-soon {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  padding: 2rem;
  text-align: center;
  background-color: rgba(58, 99, 81, 0.03); /* Color de fondo sutil usando el primary */
  border-radius: var(--radius-md);
  margin-top: var(--space-md);
}

.coming-soon-content {
  max-width: 400px;
}

.coming-soon-content h3 {
  margin: 1rem 0;
  color: var(--primary);
  font-weight: 600;
}

.coming-soon-content p {
  color: var(--text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
}

.coming-soon-content :global(.material-icons) {
  font-size: 2.5rem;
  color: var(--primary-light);
  opacity: 0.7;
}
</style>
