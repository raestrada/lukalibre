<script lang="ts">
  import { onMount } from 'svelte';
  import Tabs from '../common/Tabs.svelte';
  import Card from '../common/Card.svelte';
  import Icon from '../common/Icon.svelte';
  import StatusMessage from '../common/StatusMessage.svelte';
  import Table from '../common/Table.svelte';

  // Importar el servicio de base de datos
  import databaseService from '../../services/databaseService';

  // Estado para tablas y datos
  let tables: string[] = [];
  let tableData: Record<string, any[]> = {};
  let tableColumns: Record<string, string[]> = {};
  let activeTab: string = '';
  let loading = true;
  let error = '';
  let searchTerm = '';
  
  // Formatear las tablas para el componente Tabs
  $: formattedTabs = tables.map(table => ({
    id: table,
    label: table.charAt(0).toUpperCase() + table.slice(1),
    name: getIconForTable(table) // Asignar un icono según el tipo de tabla
  }));
  
  // Filtrar datos de la tabla según el término de búsqueda
  $: filteredData = activeTab && tableData[activeTab] 
    ? tableData[activeTab].filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : [];

  // Función para determinar iconos según el tipo de tabla
  function getIconForTable(tableName: string): string {
    const tableIconMap: Record<string, string> = {
      'transactions': 'dollar-sign',
      'accounts': 'credit-card',
      'categories': 'tag',
      'budget': 'pie-chart',
      'goals': 'target',
      'settings': 'settings'
    };
    
    return tableIconMap[tableName.toLowerCase()] || 'database';
  }
  
  // Función para cambiar de pestaña
  function handleTabChange(tabId: string) {
    activeTab = tabId;
    searchTerm = '';
  }
  
  // Formatear el valor según el tipo de dato
  function formatCellValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (value === '') return '[vacío]';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
  
  // Verificar si un valor está vacío para aplicar estilos
  function isEmptyValue(value: any): boolean {
    return value === null || value === undefined || value === '';
  }

  onMount(async () => {
    loading = true;
    try {
      // Obtener todas las tablas
      tables = await databaseService.listTables();
      if (tables.length > 0) {
        activeTab = tables[0];
        // Cargar datos y columnas de todas las tablas
        for (const table of tables) {
          tableData[table] = await databaseService.getAll(table);
          tableColumns[table] = await databaseService.getTableColumns(table);
        }
      }
    } catch (e) {
      error = 'No se pudieron cargar las tablas de la base de datos.';
    }
    loading = false;
  });
</script>

<div class="data-viewer">
  <h2 class="data-title">Datos</h2>
  
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>Cargando datos...</p>
    </div>
  {:else if error}
    <StatusMessage type="error" message={error} />
  {:else if tables.length === 0}
    <StatusMessage type="info" message="No hay tablas en la base de datos." />
  {:else}
    <Card variant="default" padding="md" elevated={true} fullWidth={true} className="data-card">
      <div class="data-header">
        <Tabs tabs={formattedTabs} {activeTab} onTabChange={handleTabChange} />
        
        <div class="search-container">
          <div class="search-input-wrapper">
            <Icon name="search" size={16} />
            <input 
              type="text" 
              placeholder="Buscar en tabla..." 
              bind:value={searchTerm}
              class="search-input" 
            />
            {#if searchTerm}
              <button class="clear-search" on:click={() => searchTerm = ''}>
                <Icon name="x" size={14} />
              </button>
            {/if}
          </div>
        </div>
      </div>
      
      <div class="table-container">
        {#if activeTab && tableData[activeTab]}
          {#if filteredData.length > 0}
            <div class="responsive-table-wrapper">
              <Table
                columns={tableColumns[activeTab] || []}
                rows={filteredData}
                {formatCellValue}
                {isEmptyValue}
              >
                <div slot="empty">
                  {#if searchTerm}
                    <Icon name="search" size={24} />
                    <p>No se encontraron resultados para "{searchTerm}"</p>
                    <button class="reset-search" on:click={() => searchTerm = ''}>
                      Mostrar todos los datos
                    </button>
                  {:else}
                    <Icon name="database" size={24} />
                    <p>No hay datos en esta tabla</p>
                  {/if}
                </div>
              </Table>
            </div>
            <div class="table-footer">
              Mostrando {filteredData.length} de {tableData[activeTab].length} registros
              {#if searchTerm}
                (filtrados por "{searchTerm}")
              {/if}
            </div>
          {:else}
            <div class="no-data-message">
              {#if searchTerm}
                <Icon name="search" size={24} />
                <p>No se encontraron resultados para "{searchTerm}"</p>
                <button class="reset-search" on:click={() => searchTerm = ''}>
                  Mostrar todos los datos
                </button>
              {:else}
                <Icon name="database" size={24} />
                <p>No hay datos en esta tabla</p>
              {/if}
            </div>
          {/if}
        {/if}
      </div>
    </Card>
  {/if}
</div>

<style>
  .data-viewer {
    padding: var(--space-md);
    width: 100%;
  }
  
  .data-title {
    font-size: 1.5rem;
    color: var(--text-primary);
    font-weight: 700;
    margin-bottom: 1rem;
  }
  
  :global(.data-card) {
    overflow: hidden;
  }
  
  .data-header {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  @media (min-width: 768px) {
    .data-header {
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
    }
  }
  
  .search-container {
    margin: 1rem 0.5rem;
  }
  
  @media (min-width: 768px) {
    .search-container {
      margin: 0 1rem 0 0;
    }
  }
  
  .search-input-wrapper {
    display: flex;
    align-items: center;
    background-color: var(--background-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.5rem 0.75rem;
    width: 100%;
    max-width: 300px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  .search-input-wrapper:focus-within {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(58, 99, 81, 0.15);
  }
  
  .search-input {
    border: none;
    background: transparent;
    padding: 0 0.5rem;
    flex-grow: 1;
    color: var(--text-primary);
    font-size: 0.9rem;
  }
  
  .search-input:focus {
    outline: none;
  }
  
  .clear-search {
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    color: var(--text-secondary);
  }
  
  .table-container {
    padding: 0.5rem;
    overflow: hidden;
  }
  
  .responsive-table-wrapper {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    background-color: var(--background-primary);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    text-align: center;
  }
  
  .loading-spinner {
    display: inline-block;
    width: 40px;
    height: 40px;
    border: 4px solid var(--primary-light);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .no-data-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    color: var(--text-secondary);
    text-align: center;
  }
  
  .no-data-message p {
    margin: 1rem 0;
  }
  
  .reset-search {
    background-color: var(--primary-light);
    color: var(--primary);
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    margin-top: 0.5rem;
  }
  
  .reset-search:hover {
    background-color: var(--primary-lighter);
  }
  
  .table-footer {
    display: flex;
    justify-content: flex-end;
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
    border-top: 1px solid var(--border);
    margin-top: 0.5rem;
  }
</style>
