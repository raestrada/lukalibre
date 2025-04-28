<script lang="ts">
  import { onMount } from 'svelte';
  import Card from '../common/Card.svelte';
  import ReportCard from '../common/ReportCard.svelte';
  import Tabs from '../common/Tabs.svelte';
  import Chart from '../common/Chart.svelte';
  import FinancialValue from '../common/FinancialValue.svelte';
  import Alert from '../common/Alert.svelte';
  import ProgressBar from '../common/ProgressBar.svelte';
  import Icon from '../common/Icon.svelte';

  // Datos del reporte proporcionados por el LLM
  export let reportData: any = null;

  // Estado del componente
  let activeTab = 'resumen';

  // Tabs del reporte financiero
  const tabs = [
    { id: 'resumen', label: 'Resumen', name: 'assessment' },
    { id: 'analisis', label: 'Análisis', name: 'analytics' },
    { id: 'metas', label: 'Metas', name: 'flag' },
    { id: 'alertas', label: 'Alertas', name: 'notifications' },
    { id: 'categorias', label: 'Categorías', name: 'category' },
    { id: 'consejos', label: 'Consejos', name: 'tips_and_updates' },
  ];

  // Cambiar la pestaña activa
  function setActiveTab(tabId) {
    activeTab = tabId;
  }

  // Datos de ejemplo para previsualización (se sobrescriben con reportData real)
  let data = {
    resumen: {
      saldoTotal: '$0',
      ingresosMes: '$0',
      egresosMes: '$0',
      patrimonioNeto: '$0',
      variacionPatrimonio: 0,
    },
    analisis: {
      graficos: [],
    },
    metas: {
      items: [],
    },
    alertas: {
      items: [],
    },
    categorias: {
      gastosPrincipales: [],
      gastosDeducibles: [],
    },
    consejos: {
      items: [],
    },
  };

  // Cuando los datos del reporte estén disponibles, actualizamos el state
  $: if (reportData) {
    data = reportData;
  }
</script>

<div class="financial-report">
  <!-- Barra de pestañas para navegar entre secciones -->
  <Tabs {tabs} {activeTab} onTabChange={setActiveTab} />

  <!-- Contenido según la pestaña activa -->
  <div class="report-content">
    <!-- Pestaña de Resumen -->
    {#if activeTab === 'resumen' && data.resumen}
      <div class="report-grid">
        <ReportCard title="Balance General" icon="account_balance_wallet">
          <div class="values-grid">
            <FinancialValue value={data.resumen.saldoTotal} label="Saldo Total" size="lg" />
            <FinancialValue value={data.resumen.ingresosMes} label="Ingresos del Mes" trend="up" />
            <FinancialValue value={data.resumen.egresosMes} label="Gastos del Mes" trend="down" />
            <FinancialValue
              value={data.resumen.patrimonioNeto}
              label="Patrimonio Neto"
              trend={data.resumen.variacionPatrimonio > 0
                ? 'up'
                : data.resumen.variacionPatrimonio < 0
                  ? 'down'
                  : 'neutral'}
            />
          </div>
        </ReportCard>

        {#if data.resumen.informacionAdicional}
          <ReportCard title="Información Adicional" icon="info">
            <p>{data.resumen.informacionAdicional}</p>
          </ReportCard>
        {/if}
      </div>

      <!-- Pestaña de Análisis -->
    {:else if activeTab === 'analisis' && data.analisis}
      <div class="report-grid">
        {#each data.analisis.graficos as grafico, i}
          <ReportCard title={grafico.titulo} icon="bar_chart">
            <Chart type={grafico.tipo} data={grafico.datos} height="250px" />
          </ReportCard>
        {/each}

        {#if data.analisis.graficos.length === 0}
          <ReportCard title="Sin datos suficientes" icon="info">
            <p>No hay suficientes datos para generar gráficos de análisis.</p>
          </ReportCard>
        {/if}
      </div>

      <!-- Pestaña de Metas -->
    {:else if activeTab === 'metas' && data.metas}
      <div class="report-grid">
        {#each data.metas.items as meta, i}
          <ReportCard title={meta.nombre} icon="flag">
            <p>{meta.descripcion}</p>
            <ProgressBar
              value={meta.progreso}
              max={meta.objetivo}
              label={`${meta.progreso} de ${meta.objetivo} ${meta.unidad}`}
              variant={meta.progreso / meta.objetivo >= 0.8
                ? 'success'
                : meta.progreso / meta.objetivo >= 0.5
                  ? 'default'
                  : 'warning'}
            />
          </ReportCard>
        {/each}

        {#if data.metas.items.length === 0}
          <ReportCard title="Sin metas activas" icon="flag">
            <p>No tienes metas financieras activas actualmente.</p>
          </ReportCard>
        {/if}
      </div>

      <!-- Pestaña de Alertas -->
    {:else if activeTab === 'alertas' && data.alertas}
      <div class="report-grid">
        {#each data.alertas.items as alerta, i}
          <Alert
            type={alerta.tipo}
            title={alerta.titulo}
            message={alerta.mensaje}
            dismissible={false}
          />
        {/each}

        {#if data.alertas.items.length === 0}
          <ReportCard title="Sin alertas" icon="notifications_off">
            <p>No tienes alertas financieras actualmente.</p>
          </ReportCard>
        {/if}
      </div>

      <!-- Pestaña de Categorías -->
    {:else if activeTab === 'categorias' && data.categorias}
      <div class="report-grid">
        <ReportCard title="Principales Gastos" icon="trending_down">
          {#if data.categorias.gastosPrincipales.length > 0}
            <div class="category-list">
              {#each data.categorias.gastosPrincipales as gasto, i}
                <div class="category-item">
                  <div class="category-name">
                    <span class="category-rank">{i + 1}</span>
                    <span>{gasto.categoria}</span>
                  </div>
                  <div class="category-value">{gasto.monto}</div>
                </div>
              {/each}
            </div>
          {:else}
            <p>No hay datos de gastos disponibles.</p>
          {/if}
        </ReportCard>

        <ReportCard title="Gastos Deducibles" icon="receipt_long">
          {#if data.categorias.gastosDeducibles.length > 0}
            <div class="category-list">
              {#each data.categorias.gastosDeducibles as gasto, i}
                <div class="category-item">
                  <div class="category-name">
                    <span>{gasto.categoria}</span>
                  </div>
                  <div class="category-value">{gasto.monto}</div>
                </div>
              {/each}
            </div>
          {:else}
            <p>No hay gastos deducibles registrados.</p>
          {/if}
        </ReportCard>
      </div>

      <!-- Pestaña de Consejos -->
    {:else if activeTab === 'consejos' && data.consejos}
      <div class="report-grid">
        {#each data.consejos.items as consejo, i}
          <ReportCard title={consejo.titulo} icon="tips_and_updates" variant="info">
            <p>{consejo.texto}</p>
          </ReportCard>
        {/each}

        {#if data.consejos.items.length === 0}
          <ReportCard title="Sin consejos disponibles" icon="tips_and_updates">
            <p>No hay consejos financieros personalizados disponibles en este momento.</p>
          </ReportCard>
        {/if}
      </div>

      <!-- Mensaje por defecto si no hay datos -->
    {:else}
      <div class="no-data">
        <p>No hay datos disponibles para esta sección.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .financial-report {
    width: 100%;
  }

  .report-content {
    margin-top: var(--space-md);
  }

  .report-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-md);
  }

  .values-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: var(--space-md);
    margin: var(--space-sm) 0;
  }

  .no-data {
    text-align: center;
    padding: var(--space-xl);
    color: var(--text-secondary);
  }

  .category-list {
    margin: var(--space-sm) 0;
  }

  .category-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-xs) 0;
    border-bottom: 1px solid var(--border);
  }

  .category-name {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  .category-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--primary);
    color: white;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .category-value {
    font-weight: 600;
    color: var(--primary);
  }
</style>
