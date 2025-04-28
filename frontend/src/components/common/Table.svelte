<script lang="ts">
  export let columns: string[] = [];
  export let rows: any[] = [];
  export let emptyMessage: string = 'No hay datos para mostrar.';
  export let formatCellValue: (value: any) => string = (value) => {
    if (value === null || value === undefined) return '-';
    if (value === '') return '[vacío]';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };
  export let isEmptyValue: (value: any) => boolean = (value) => {
    return value === null || value === undefined || value === '';
  };
</script>

<div class="responsive-table-wrapper">
  {#if rows.length > 0}
    <table class="data-table">
      <thead>
        <tr>
          {#each columns as col}
            <th>{col}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as row}
          <tr>
            {#each columns as col}
              <td>
                <div
                  class="cell-content {isEmptyValue(row[col]) ? 'empty-value' : ''}"
                  title={formatCellValue(row[col])}
                >
                  {formatCellValue(row[col])}
                </div>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <div class="no-data-message">
      <slot name="empty">
        <p>{emptyMessage}</p>
      </slot>
    </div>
  {/if}
</div>

<style>
  .responsive-table-wrapper {
    width: 100%;
    overflow-x: auto;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--background-secondary, #fff);
    color: var(--text-primary, #222);
    font-size: 0.97rem;
    table-layout: auto;
  }
  .data-table th,
  .data-table td {
    padding: 0.6em 0.8em;
    border-bottom: 1px solid var(--border-color, #eee);
    text-align: left;
    max-width: 320px;
    word-break: break-word;
    vertical-align: top;
  }
  .data-table th {
    background: var(--background-tertiary, #f8f8f8);
    font-weight: 700;
    color: var(--text-secondary, #333);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .cell-content {
    white-space: pre-line;
    overflow-wrap: anywhere;
    color: var(--text-primary, #222);
  }
  .cell-content.empty-value {
    color: var(--text-disabled, #aaa);
    font-style: italic;
  }
  .no-data-message {
    text-align: center;
    color: var(--text-secondary, #666);
    padding: 1.5em 0.5em;
    font-size: 1.05rem;
  }
</style>
