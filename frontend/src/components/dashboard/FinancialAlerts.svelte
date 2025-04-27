<script lang="ts">
  import { onMount } from 'svelte';
  import * as dashboardService from '../../services/dashboardService';
  import Card from '../common/Card.svelte';
  import Icon from '../common/Icon.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import ExpandablePanel from '../common/ExpandablePanel.svelte';
  import ColorCodedItem from '../common/ColorCodedItem.svelte';
  
  // Props y estado local
  export let alertsData: Record<string, any> | null = null;
  
  // Si se reciben datos externamente, usarlos en lugar de generar nuevos
  $: alerts = alertsData || null;
  
  let loading = false;
  let error = '';
  let lastUpdated: Date | null = null;
  let expanded: Record<string, boolean> = {};
  
  // Inicializar estado de expansión cuando cambian las alertas
  $: if (alerts?.alertas) {
    alerts.alertas.forEach((alert: any, index: number) => {
      // Expandir solo la primera alerta por defecto
      if (expanded[index] === undefined) {
        expanded[index] = index === 0;
      }
    });
  }
  
  // Usar datos del localStorage solo si no se recibieron desde props
  onMount(async () => {
    if (!alertsData) {
      const cached = localStorage.getItem('financial_alerts');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          alerts = parsed.data;
          lastUpdated = new Date(parsed.timestamp);
        } catch (e) {
          console.error('Error al cargar alertas guardadas:', e);
        }
      }
      
      // Si no hay datos en caché o son antiguos (más de 24 horas), generarlos
      const needsRefresh = !lastUpdated || 
                          (new Date().getTime() - lastUpdated.getTime()) > 24 * 60 * 60 * 1000;
      
      if (!alerts || needsRefresh) {
        await generateAlerts();
      }
    }
  });
  
  // Función para generar alertas desde el servicio
  async function generateAlerts() {
    if (loading) return;
    
    loading = true;
    error = '';
    
    try {
      alerts = await dashboardService.generateFinancialAlerts();
      
      // Guardar en localStorage
      const toCache = {
        data: alerts,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('financial_alerts', JSON.stringify(toCache));
      lastUpdated = new Date();
      
    } catch (err: any) {
      console.error('Error generando alertas:', err);
      error = err.message || 'Error generando alertas financieras';
    } finally {
      loading = false;
    }
  }
  
  function toggleAlertExpanded(index: number) {
    expanded[index] = !expanded[index];
    expanded = {...expanded}; // Forzar actualización reactiva
  }
  
  function clearAlerts() {
    alerts = null;
    localStorage.removeItem('financial_alerts');
    lastUpdated = null;
  }
  
  function getTipoAlertaIcon(tipo: string): string {
    switch(tipo.toLowerCase()) {
      case 'peligro': return 'alert-circle';
      case 'advertencia': return 'alert-triangle';
      case 'informacion': return 'info';
      case 'exito': return 'check-circle';
      default: return 'bell';
    }
  }
  
  function getTipoAlertaType(tipo: string): 'default' | 'success' | 'warning' | 'info' | 'danger' {
    switch(tipo.toLowerCase()) {
      case 'peligro': return 'danger';
      case 'advertencia': return 'warning';
      case 'informacion': return 'info';
      case 'exito': return 'success';
      default: return 'default';
    }
  }
  
  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }
</script>

<div class="alerts-container">
  {#if alerts}
    <div class="alerts-summary">
      <div class="summary-text">
        <h3>Resumen</h3>
        <p>{alerts.resumen}</p>
      </div>
      
      <div class="alert-counters">
        {#if alerts.total_alertas_por_tipo}
          <div class="counter alert-danger">
            <Icon name="alert-circle" />
            <span>{alerts.total_alertas_por_tipo.peligro || 0}</span>
          </div>
          <div class="counter alert-warning">
            <Icon name="alert-triangle" />
            <span>{alerts.total_alertas_por_tipo.advertencia || 0}</span>
          </div>
          <div class="counter alert-info">
            <Icon name="info" />
            <span>{alerts.total_alertas_por_tipo.informacion || 0}</span>
          </div>
          <div class="counter alert-success">
            <Icon name="check-circle" />
            <span>{alerts.total_alertas_por_tipo.exito || 0}</span>
          </div>
        {/if}
      </div>
    </div>
  
    {#if alerts.alertas && alerts.alertas.length > 0}
      <div class="alerts-list">
        {#each alerts.alertas as alerta, index}
          <ExpandablePanel
            title={alerta.titulo}
            subtitle={alerta.categoria || ''}
            icon={getTipoAlertaIcon(alerta.tipo)}
            type={getTipoAlertaType(alerta.tipo)}
            borderPosition="left"
            bind:expanded={expanded[index]}
          >
            <svelte:fragment slot="header-end">
              {#if alerta.vencimiento}
                <span class="alert-date">Vence: {formatDate(alerta.vencimiento)}</span>
              {/if}
            </svelte:fragment>
            
            <div class="alert-content">
              <p class="alert-message">{alerta.mensaje}</p>
              
              {#if alerta.accion_recomendada}
                <div class="alert-action">
                  <h5>Acción recomendada:</h5>
                  <p>{alerta.accion_recomendada}</p>
                </div>
              {/if}
            </div>
          </ExpandablePanel>
        {/each}
      </div>
    {:else}
      <div class="no-alerts">
        <p>No hay alertas activas en este momento. ¡Buen trabajo!</p>
      </div>
    {/if}
    
    {#if lastUpdated}
      <div class="last-updated">
        Última actualización: {formatDate(lastUpdated.toISOString())}
      </div>
    {/if}
  {/if}
  
  {#if error}
    <StatusMessage type="error" message={error} />
  {/if}
</div>

<style>
  .alerts-container {
    width: 100%;
    max-width: 100%;
  }
  
  .alerts-summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    background: var(--surface);
    box-shadow: var(--shadow-sm);
  }
  
  @media (min-width: 768px) {
    .alerts-summary {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
    
    .summary-text {
      max-width: 70%;
    }
  }
  
  .summary-text h3 {
    margin-top: 0;
    margin-bottom: var(--space-xs);
    font-size: 1.2rem;
    color: var(--text-primary);
  }
  
  .summary-text p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  
  .alert-counters {
    display: flex;
    gap: var(--space-md);
    flex-wrap: wrap;
  }
  
  .counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-sm);
    border-radius: var(--radius-sm);
    min-width: 60px;
    text-align: center;
  }
  
  .counter span {
    font-size: 1.2rem;
    font-weight: 600;
    margin-top: var(--space-xs);
  }
  
  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }
  
  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
  }
  
  .alert-date {
    white-space: nowrap;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }
  
  .alert-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .alert-message {
    margin: 0;
    line-height: 1.5;
  }
  
  .alert-action {
    padding-top: var(--space-sm);
    border-top: 1px dashed var(--border);
  }
  
  .alert-action h5 {
    font-size: 0.9rem;
    margin-top: 0;
    margin-bottom: var(--space-xs);
    color: var(--text-secondary);
  }
  
  .alert-action p {
    margin: 0;
    font-weight: 500;
  }
  
  .no-alerts {
    text-align: center;
    padding: var(--space-lg);
    background: var(--surface-secondary);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
  }
  
  .last-updated {
    font-size: 0.85rem;
    color: var(--text-tertiary);
    text-align: right;
    margin-top: var(--space-md);
  }
  
  @media (max-width: 576px) {
    .alert-metadata {
      flex-direction: column;
      align-items: flex-end;
    }
    
    .alert-header {
      flex-wrap: wrap;
    }
  }
</style>
