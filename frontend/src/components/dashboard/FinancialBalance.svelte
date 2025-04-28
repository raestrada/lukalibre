<script lang="ts">
  import Card from '../common/Card.svelte';
  import ReportCard from '../common/ReportCard.svelte';
  import Chart from '../common/Chart.svelte';
  import FinancialValue from '../common/FinancialValue.svelte';
  import ProgressBar from '../common/ProgressBar.svelte';
  import Alert from '../common/Alert.svelte';

  // Datos que se reciben del LLM
  export let balanceData: any = {
    resumen: {
      activos: {
        total: '$0',
        items: [],
      },
      pasivos: {
        total: '$0',
        items: [],
      },
      patrimonio: {
        total: '$0',
        tendencia: 0,
      },
    },
    graficos: [],
    ratios: [],
    distribucion: {
      activos: [],
      pasivos: [],
    },
    tendencias: {
      patrimonio: [],
      activos: [],
      pasivos: [],
    },
    recomendaciones: [],
  };
</script>

<div class="financial-balance">
  <!-- Resumen del Balance -->
  <div class="balance-grid">
    <!-- Tarjeta principal de patrimonio neto -->
    <ReportCard title="Patrimonio Neto" icon="account_balance" variant="info">
      <div class="patrimonio-container">
        <div class="patrimonio-principal">
          <FinancialValue
            label="Tu Patrimonio"
            value={balanceData.resumen.patrimonio.total}
            trend={balanceData.resumen.patrimonio.tendencia}
            size="lg"
          />
        </div>

        <div class="balances-principales">
          <div class="activos-totales">
            <FinancialValue
              label="Activos Totales"
              value={balanceData.resumen.activos.total}
              size="lg"
              trend="up"
            />
          </div>
          <div class="pasivos-totales">
            <FinancialValue
              label="Pasivos Totales"
              value={balanceData.resumen.pasivos.total}
              size="lg"
              trend="down"
            />
          </div>
        </div>
      </div>
    </ReportCard>

    <!-- Gráfico de distribución -->
    {#if balanceData.graficos && balanceData.graficos.length > 0 && balanceData.graficos[0]}
      <ReportCard title="Distribución de Activos y Pasivos" icon="pie_chart" variant="default">
        <div class="chart-container">
          <Chart
            type={balanceData.graficos[0].tipo || 'pie'}
            data={balanceData.graficos[0].datos}
            height="200px"
          />
        </div>
      </ReportCard>
    {/if}

    <!-- Ratios financieros importantes -->
    <ReportCard title="Ratios Financieros" icon="trending_up" variant="default">
      <div class="ratios-grid">
        {#if balanceData.ratios && balanceData.ratios.length > 0}
          {#each balanceData.ratios as ratio}
            <div class="ratio-item">
              <ProgressBar
                label={ratio.nombre}
                value={ratio.valor * 100}
                max={100}
                showPercentage={true}
                variant={ratio.tipo || 'default'}
              />
              <p class="ratio-description">{ratio.descripcion}</p>
            </div>
          {/each}
        {:else}
          <p>No hay ratios financieros disponibles.</p>
        {/if}
      </div>
    </ReportCard>
  </div>

  <!-- Detalles de Activos -->
  <ReportCard title="Detalle de Activos" icon="savings" variant="success">
    <div class="detalles-grid">
      {#if balanceData.resumen.activos.items && balanceData.resumen.activos.items.length > 0}
        {#each balanceData.resumen.activos.items as activo}
          <div class="detalle-item">
            <FinancialValue label={activo.nombre} value={activo.valor} size="md" trend="up" />
            {#if activo.descripcion}
              <p class="detalle-descripcion">{activo.descripcion}</p>
            {/if}
          </div>
        {/each}
      {:else}
        <p>No hay activos registrados.</p>
      {/if}
    </div>
  </ReportCard>

  <!-- Detalles de Pasivos -->
  <ReportCard title="Detalle de Pasivos" icon="credit_card" variant="error">
    <div class="detalles-grid">
      {#if balanceData.resumen.pasivos.items && balanceData.resumen.pasivos.items.length > 0}
        {#each balanceData.resumen.pasivos.items as pasivo}
          <div class="detalle-item">
            <FinancialValue label={pasivo.nombre} value={pasivo.valor} size="md" trend="down" />
            {#if pasivo.descripcion}
              <p class="detalle-descripcion">{pasivo.descripcion}</p>
            {/if}
          </div>
        {/each}
      {:else}
        <p>No hay pasivos registrados.</p>
      {/if}
    </div>
  </ReportCard>

  <!-- Recomendaciones -->
  {#if balanceData.recomendaciones && balanceData.recomendaciones.length > 0}
    <ReportCard title="Recomendaciones para tu Balance" icon="lightbulb" variant="warning">
      <div class="recomendaciones-container">
        {#each balanceData.recomendaciones as recomendacion}
          <Alert
            type={recomendacion.tipo || 'info'}
            title={recomendacion.titulo}
            message={recomendacion.mensaje}
          />
        {/each}
      </div>
    </ReportCard>
  {/if}
</div>

<style>
  .financial-balance {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-top: var(--space-md);
  }

  .balance-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-md);
  }

  .patrimonio-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-md);
    width: 100%;
  }

  .patrimonio-principal {
    text-align: center;
    margin-bottom: var(--space-sm);
  }

  .balances-principales {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: var(--space-md);
  }

  .chart-container {
    height: 200px;
    margin: var(--space-sm) 0;
  }

  .ratios-grid,
  .detalles-grid {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  .ratio-description,
  .detalle-descripcion {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: var(--space-xs);
  }

  .recomendaciones-container {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .balance-grid {
      grid-template-columns: 1fr;
    }

    .balances-principales {
      flex-direction: column;
      gap: var(--space-md);
    }
  }
</style>
