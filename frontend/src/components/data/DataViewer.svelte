<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Asumimos que tienes un servicio para acceder a SQLite en el browser
  import databaseService from '../../services/databaseService';

  // Estado para tablas y datos
  let tables: string[] = [];
  let tableData: Record<string, any[]> = {};
  let activeTab: string = '';
  let loading = true;
  let error = '';

  onMount(async () => {
    loading = true;
    try {
      // Obtener todas las tablas
      tables = await databaseService.listTables();
      if (tables.length > 0) {
        activeTab = tables[0];
        // Cargar datos de todas las tablas
        for (const table of tables) {
          tableData[table] = await databaseService.getAll(table);
        }
      }
    } catch (e) {
      error = 'No se pudieron cargar las tablas de la base de datos.';
    }
    loading = false;
  });
</script>

<div class="data-viewer">
  <h1>Datos de SQLite (Browser)</h1>
  {#if loading}
    <div class="loading">Cargando datos...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else if tables.length === 0}
    <div>No hay tablas en la base de datos.</div>
  {:else}
    <div class="tabs">
      {#each tables as table}
        <button
          class:active={activeTab === table}
          on:click={() => (activeTab = table)}
        >
          {table}
        </button>
      {/each}
    </div>
    <div class="tab-content">
      {#if activeTab && tableData[activeTab]}
        <table>
          <thead>
            <tr>
              {#each Object.keys(tableData[activeTab][0] || {}) as col}
                <th>{col}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each tableData[activeTab] as row}
              <tr>
                {#each Object.values(row) as value}
                  <td>{value}</td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  {/if}
</div>

<style lang="css">
.data-viewer {
  padding: var(--space-xl);
}
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
.tabs button {
  background: var(--primary-light);
  color: var(--text-primary);
  border: none;
  padding: 0.5rem 1.5rem;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  font-weight: 600;
  outline: none;
  transition: background 0.2s;
}
.tabs button.active,
.tabs button:hover {
  background: var(--primary);
  color: var(--text-inverse);
}
.tab-content {
  background: white;
  border-radius: 0 8px 8px 8px;
  box-shadow: 0 2px 8px var(--shadow);
  padding: 2rem;
  min-height: 120px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #eee;
  padding: 0.5rem 0.8rem;
  text-align: left;
}
th {
  background: var(--primary-light);
}
.loading, .error {
  padding: 2rem;
  text-align: center;
  color: var(--danger);
}
</style>
