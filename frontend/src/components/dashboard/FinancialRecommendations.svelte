<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import * as dashboardService from '../../services/dashboardService';
  import Card from '../common/Card.svelte';
  import Icon from '../common/Icon.svelte';
  import ProgressBar from '../common/ProgressBar.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';

  // Props y estado local
  export let recommendationsData: Record<string, any> | null = null;

  // Si se reciben datos externamente, usarlos en lugar de generar nuevos
  $: recommendations = recommendationsData || null;

  let loading = false;
  let error = '';
  let lastUpdated: Date | null = null;
  let expanded: Record<string, boolean> = {};

  // Inicializar estado de expansión cuando cambian las recomendaciones
  $: if (recommendations?.recomendaciones) {
    recommendations.recomendaciones.forEach((rec: any, index: number) => {
      // Expandir solo la primera recomendación por defecto
      if (expanded[index] === undefined) {
        expanded[index] = index === 0;
      }
    });
  }

  // Usar datos del localStorage solo si no se recibieron desde props
  onMount(async () => {
    if (!recommendationsData) {
      const cached = localStorage.getItem('financial_recommendations');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          recommendations = parsed.data;
          lastUpdated = new Date(parsed.timestamp);
        } catch (e) {
          console.error('Error al cargar recomendaciones guardadas:', e);
        }
      }

      // Si no hay datos en caché o son antiguos (más de 24 horas), generarlos
      const needsRefresh =
        !lastUpdated || new Date().getTime() - lastUpdated.getTime() > 24 * 60 * 60 * 1000;

      if (!recommendations || needsRefresh) {
        await generateRecommendations();
      }
    }
  });

  // Función para generar nuevas recomendaciones
  async function generateRecommendations() {
    loading = true;
    error = '';

    try {
      recommendations = await dashboardService.generateFinancialRecommendations();
      lastUpdated = new Date();

      // Guardar en localStorage
      localStorage.setItem(
        'financial_recommendations',
        JSON.stringify({
          data: recommendations,
          timestamp: lastUpdated.toISOString(),
        }),
      );

      // El estado de expansión se inicializa en el bloque reactivo
    } catch (e: any) {
      error = e.message || 'Error al generar recomendaciones financieras';
      console.error('Error en generación de recomendaciones:', e);
    } finally {
      loading = false;
    }
  }

  // Formatear fecha
  function formatDate(date: Date | null): string {
    if (!date) return 'No disponible';
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Toggle expansión de recomendación
  function toggleExpand(index: number) {
    expanded[index] = !expanded[index];
    expanded = { ...expanded }; // Trigger reactivity
  }

  // Clase CSS según prioridad
  function getPriorityClass(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'alta':
        return 'priority-high';
      case 'media':
        return 'priority-medium';
      case 'baja':
        return 'priority-low';
      default:
        return '';
    }
  }

  // Icono según prioridad
  function getPriorityIcon(priority: string): string {
    switch (priority.toLowerCase()) {
      case 'alta':
        return 'alert-triangle';
      case 'media':
        return 'alert-circle';
      case 'baja':
        return 'info';
      default:
        return 'help-circle';
    }
  }
</script>

<div class="recommendations-container">
  <div class="recommendations-header">
    <h2>Recomendaciones Financieras</h2>

    <div class="actions">
      {#if lastUpdated}
        <span class="last-updated">Actualizado: {formatDate(lastUpdated)}</span>
      {/if}

      <button
        class="refresh-button"
        on:click={generateRecommendations}
        disabled={loading}
        title="Generar nuevas recomendaciones"
      >
        <Icon name={loading ? 'loader' : 'refresh-cw'} size={16} />
        {loading ? 'Generando...' : 'Actualizar'}
      </button>
    </div>
  </div>

  {#if loading && !recommendations}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Analizando tus finanzas...</p>
    </div>
  {:else if error && !recommendations}
    <StatusMessage
      type="error"
      message={error}
      actions={[{ label: 'Reintentar', onClick: generateRecommendations }]}
    />
  {:else if recommendations}
    <div class="financial-score">
      <div class="score-header">
        <h3>Salud Financiera</h3>
        <div class="score-value">{recommendations.puntaje_salud_financiera || 'N/A'}/10</div>
      </div>

      <ProgressBar
        value={recommendations.puntaje_salud_financiera || 0}
        max={10}
        label=""
        showPercentage={false}
        variant={recommendations.puntaje_salud_financiera >= 7
          ? 'success'
          : recommendations.puntaje_salud_financiera >= 4
            ? 'warning'
            : 'error'}
      />

      <div class="score-summary">
        {recommendations.resumen || 'No hay suficientes datos para evaluar tu salud financiera.'}
      </div>
    </div>

    <div class="recommendations-list">
      <h3>Recomendaciones Personalizadas</h3>

      {#if recommendations.recomendaciones?.length > 0}
        {#each recommendations.recomendaciones as rec, index}
          <Card
            variant="outline"
            padding="md"
            className={`recommendation-card ${getPriorityClass(rec.prioridad || '')}`}
          >
            <div
              class="recommendation-header"
              on:click={() => toggleExpand(index)}
              on:keydown={(e) => e.key === 'Enter' && toggleExpand(index)}
              role="button"
              tabindex="0"
              aria-expanded={expanded[index]}
            >
              <div class="recommendation-title">
                <Icon name={getPriorityIcon(rec.prioridad || '')} size={18} />
                <h4>{rec.titulo}</h4>
                {#if rec.prioridad}
                  <span class={`priority-badge ${getPriorityClass(rec.prioridad)}`}>
                    {rec.prioridad}
                  </span>
                {/if}
              </div>
              <button class="expand-button">
                <Icon name={expanded[index] ? 'chevron-up' : 'chevron-down'} size={16} />
              </button>
            </div>

            {#if expanded[index]}
              <div class="recommendation-content" transition:slide={{ duration: 200 }}>
                <p class="recommendation-description">{rec.descripcion}</p>

                {#if rec.impacto}
                  <div class="recommendation-impact">
                    <strong>Impacto:</strong>
                    {rec.impacto}
                  </div>
                {/if}

                {#if rec.accionable !== undefined}
                  <div class="recommendation-actionable">
                    <strong>Accionable:</strong>
                    {rec.accionable
                      ? 'Puedes implementarlo de inmediato'
                      : 'Requiere planificación'}
                  </div>
                {/if}
              </div>
            {/if}
          </Card>
        {/each}
      {:else}
        <div class="no-recommendations">
          <Icon name="search" size={24} />
          <p>
            No hay recomendaciones disponibles. Añade más transacciones para obtener recomendaciones
            personalizadas.
          </p>
        </div>
      {/if}
    </div>
  {:else}
    <div class="no-data">
      <Icon name="database" size={24} />
      <p>No hay datos suficientes para generar recomendaciones.</p>
      <button class="generate-button" on:click={generateRecommendations}>
        Generar Recomendaciones
      </button>
    </div>
  {/if}
</div>

<style>
  .recommendations-container {
    width: 100%;
    padding: var(--space-md);
  }

  .recommendations-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .recommendations-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .last-updated {
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .refresh-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background-color: var(--primary-light);
    color: var(--primary);
    border: none;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-button:hover {
    background-color: var(--primary-lighter);
  }

  .refresh-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    background-color: var(--background-primary);
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid var(--primary-light);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .financial-score {
    background-color: var(--background-primary);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .score-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .score-header h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
  }

  .score-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--primary);
  }

  .score-summary {
    margin-top: 1rem;
    color: var(--text-secondary);
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .recommendations-list {
    margin-top: 2rem;
  }

  .recommendations-list h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  :global(.recommendation-card) {
    margin-bottom: 1rem;
    border-left-width: 4px !important;
  }

  :global(.recommendation-card.priority-high) {
    border-left-color: var(--danger) !important;
  }

  :global(.recommendation-card.priority-medium) {
    border-left-color: var(--warning) !important;
  }

  :global(.recommendation-card.priority-low) {
    border-left-color: var(--success) !important;
  }

  .recommendation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .recommendation-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .recommendation-title h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  .priority-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 100px;
    text-transform: uppercase;
    font-weight: 700;
  }

  .priority-badge.priority-high {
    background-color: rgba(220, 53, 69, 0.1);
    color: var(--danger);
  }

  .priority-badge.priority-medium {
    background-color: rgba(255, 193, 7, 0.1);
    color: var(--warning);
  }

  .priority-badge.priority-low {
    background-color: rgba(40, 167, 69, 0.1);
    color: var(--success);
  }

  .expand-button {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--text-secondary);
  }

  .recommendation-content {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
  }

  .recommendation-description {
    margin-top: 0;
    margin-bottom: 1rem;
    line-height: 1.6;
  }

  .recommendation-impact,
  .recommendation-actionable {
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    color: var(--text-secondary);
  }

  .no-recommendations,
  .no-data {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
    color: var(--text-secondary);
    background-color: var(--background-secondary);
    border-radius: 8px;
  }

  .no-recommendations p,
  .no-data p {
    margin: 1rem 0;
    max-width: 400px;
  }

  .generate-button {
    background-color: var(--primary);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s;
  }

  .generate-button:hover {
    background-color: var(--primary-dark);
  }

  @media (max-width: 768px) {
    .recommendations-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .actions {
      width: 100%;
      justify-content: space-between;
    }

    .score-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
  }
</style>
