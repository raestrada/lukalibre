<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  // Registrar los componentes necesarios de Chart.js
  Chart.register(...registerables);

  // Tipos de gráficos soportados
  export let type: 'bar' | 'line' | 'pie' | 'doughnut' = 'bar';
  // Datos del gráfico
  export let data = {
    labels: [],
    datasets: []
  };
  // Opciones del gráfico (opcionales)
  export let options = {};
  // Altura del gráfico (por defecto 200px)
  export let height: string = '200px';
  // Clase adicional
  export let className: string = '';

  let canvas: HTMLCanvasElement;
  let chartInstance: Chart;

  $: if (chartInstance && data) {
    chartInstance.data = data;
    chartInstance.update();
  }

  onMount(() => {
    chartInstance = new Chart(canvas, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            enabled: true
          }
        },
        ...options
      }
    });

    return () => {
      chartInstance.destroy();
    };
  });
</script>

<div class="chart-container {className}" style="height: {height};">
  <canvas bind:this={canvas}></canvas>
</div>

<style>
  .chart-container {
    position: relative;
    margin: var(--space-sm) 0;
    width: 100%;
  }
</style>
