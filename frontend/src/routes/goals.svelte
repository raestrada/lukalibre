<script lang="ts">
  import { onMount } from 'svelte';
  import StatusMessage from '../components/common/StatusMessage.svelte';
  import { v4 as uuidv4 } from 'uuid';
  import databaseService from '../services/databaseService';
  import type { Meta } from '../types/Meta';

  let metas: Meta[] = [];
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;

  // Formulario
  let nombre = '';
  let descripcion = '';
  let objetivo_monto = '';
  let fecha_objetivo = '';
  let prioridad = 3;
  let tipo = 'general';

  async function cargarMetas() {
    loading = true;
    error = null;
    try {
      metas = await databaseService.getMetas();
    } catch (e) {
      error = 'No se pudieron cargar las metas.';
    } finally {
      loading = false;
    }
  }

  async function crearMeta() {
    error = null;
    success = null;
    if (!nombre || !objetivo_monto || !fecha_objetivo) {
      error = 'Por favor completa todos los campos obligatorios.';
      return;
    }
    loading = true;
    try {
      await databaseService.addMeta({
        id: uuidv4(),
        nombre,
        descripcion,
        objetivo_monto: parseFloat(objetivo_monto),
        fecha_objetivo,
        prioridad,
        tipo,
        activa: true,
      });
      success = 'Meta creada exitosamente';
      nombre = '';
      descripcion = '';
      objetivo_monto = '';
      fecha_objetivo = '';
      prioridad = 3;
      tipo = 'general';
      await cargarMetas();
    } catch (e) {
      error = 'Ocurrió un error al crear la meta';
    } finally {
      loading = false;
    }
  }

  onMount(cargarMetas);
</script>

<section class="goals-page">
  <div class="goals-layout">
    <div class="goals-form-section">
      <h2>Crear nueva meta financiera</h2>
      <form class="goal-form" on:submit|preventDefault={crearMeta}>
        <div class="form-row">
          <label for="nombre">Nombre<span class="required"></span></label>
          <input id="nombre" bind:value={nombre} required placeholder="Ej: Fondo de emergencia" />
        </div>
        <div class="form-row">
          <label for="descripcion">Descripción</label>
          <input id="descripcion" bind:value={descripcion} placeholder="Descripción breve" />
        </div>
        <div class="form-row">
          <label for="objetivo_monto">Monto objetivo<span class="required"></span> ($)</label>
          <input
            id="objetivo_monto"
            type="number"
            min="1"
            bind:value={objetivo_monto}
            required
            placeholder="Ej: 1000000"
          />
        </div>
        <div class="form-row">
          <label for="fecha_objetivo">Fecha objetivo<span class="required"></span></label>
          <input id="fecha_objetivo" type="date" bind:value={fecha_objetivo} required />
        </div>
        <div class="form-row">
          <label for="prioridad">Prioridad</label>
          <input id="prioridad" type="range" min="1" max="5" bind:value={prioridad} />
          <span class="prioridad-label">{prioridad}</span>
        </div>
        <div class="form-row">
          <label for="tipo">Tipo</label>
          <select id="tipo" bind:value={tipo}>
            <option value="general">General</option>
            <option value="emergencia">Emergencia</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="vivienda">Vivienda</option>
            <option value="educacion">Educación</option>
            <option value="transporte">Transporte</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <button class="btn-primary" type="submit" disabled={loading}>Crear meta</button>
      </form>

      {#if error}
        <StatusMessage type="error" message={error} on:close={() => (error = null)} />
      {/if}
      {#if success}
        <StatusMessage type="success" message={success} on:close={() => (success = null)} />
      {/if}
    </div>
    <div class="goals-list-section">
      <h3>Mis metas</h3>
      {#if loading}
        <div class="loading-bar">Cargando...</div>
      {:else if metas.length === 0}
        <p class="empty">Aún no has creado metas financieras.</p>
      {:else}
        <ul class="goals-list">
          {#each metas as meta}
            <li class="goal-item">
              <div class="goal-main">
                <strong>{meta.nombre}</strong>
                <span class="goal-type">{meta.tipo}</span>
              </div>
              <div class="goal-details">
                <span>Monto objetivo: <b>${meta.objetivo_monto.toLocaleString()}</b></span>
                <span>Fecha: {meta.fecha_objetivo}</span>
                <span>Prioridad: {meta.prioridad}</span>
                {#if meta.descripcion}
                  <span class="goal-desc">{meta.descripcion}</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</section>

<style>
  .goals-page {
    max-width: 1100px;
    margin: 0 auto;
    padding: 2rem 1rem;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .goals-layout {
    display: flex;
    flex-direction: row;
    gap: 2rem;
  }

  .goals-form-section {
    flex: 1 1 340px;
    min-width: 290px;
    max-width: 400px;
  }

  .goals-list-section {
    flex: 2 1 460px;
    min-width: 300px;
    max-width: 650px;
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .goals-list {
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 520px;
    overflow-y: auto;
    border-radius: 8px;
    background: #f7f7f7;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
  }

  @media (max-width: 900px) {
    .goals-layout {
      flex-direction: column;
    }
    .goals-form-section,
    .goals-list-section {
      max-width: 100%;
      min-width: 0;
    }
    .goals-list {
      max-height: 340px;
    }
  }

  .goal-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .goal-form label {
    color: #26332b;
    font-weight: 600;
    font-size: 1.05rem;
    margin-bottom: 0.1rem;
    letter-spacing: 0.01em;
    display: inline-block;
  }
  .goal-form label .required {
    content: '*';
    color: #c43b3b;
    margin-left: 2px;
    font-size: 1.05em;
    vertical-align: middle;
  }
  .goals-page h2,
  .goals-page h3 {
    color: #26332b;
    font-weight: 700;
    margin-bottom: 0.7rem;
  }

  .form-row {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  input,
  select {
    padding: 0.45rem 0.7rem;
    border-radius: 6px;
    border: 1px solid #c6d3c1;
    font-size: 1rem;
    background: #f6faf7;
  }
  input[type='range'] {
    width: 100%;
  }
  .prioridad-label {
    font-size: 0.95rem;
    color: #3a6351;
    margin-left: 0.5rem;
  }
  .btn-primary {
    background: linear-gradient(90deg, #3a6351 60%, #6ec177 100%);
    color: #fff;
    border: none;
    padding: 0.7rem 1.5rem;
    border-radius: 7px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .goals-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }
  .goal-item {
    background: #f6faf7;
    border-radius: 8px;
    padding: 1rem 1.2rem;
    box-shadow: 0 2px 10px 0 rgba(58, 99, 81, 0.04);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .goal-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .goal-main strong {
    color: #263238;
    font-weight: 700;
  }

  .goal-type {
    display: inline-block;
    background: #e0f2f1;
    color: #00695c;
    font-size: 0.95em;
    padding: 2px 10px;
    border-radius: 8px;
    margin-left: 8px;
    min-width: 80px;
    text-align: center;
    font-weight: 600;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  }
  .goal-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    font-size: 0.98rem;
    color: #3a6351;
  }
  .goal-desc {
    color: #2d3a2e;
    font-size: 0.97rem;
    margin-top: 0.2rem;
    font-weight: 500;
  }
  .loading-bar {
    background: repeating-linear-gradient(90deg, #e1f2e3, #c6d3c1 10px, #e1f2e3 20px);
    border-radius: 8px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #3a6351;
    font-weight: 600;
    margin: 1.5rem 0;
    animation: shimmer 1.2s infinite linear;
  }
  @keyframes shimmer {
    0% {
      background-position: -40px 0;
    }
    100% {
      background-position: 200px 0;
    }
  }
  .empty {
    color: #6e8f7a;
    text-align: center;
    margin: 1.5rem 0;
  }
</style>
