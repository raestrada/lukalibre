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
        activa: true
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
  <h2>Crear nueva meta financiera</h2>

  <form class="goal-form" on:submit|preventDefault={crearMeta}>
    <div class="form-row">
      <label>Nombre<span class="required"></span></label>
      <input bind:value={nombre} required placeholder="Ej: Fondo de emergencia" />
    </div>
    <div class="form-row">
      <label>Descripción</label>
      <input bind:value={descripcion} placeholder="Descripción breve" />
    </div>
    <div class="form-row">
      <label>Monto objetivo<span class="required"></span> ($)</label>
      <input type="number" min="1" bind:value={objetivo_monto} required placeholder="Ej: 1000000" />
    </div>
    <div class="form-row">
      <label>Fecha objetivo<span class="required"></span></label>
      <input type="date" bind:value={fecha_objetivo} required />
    </div>
    <div class="form-row">
      <label>Prioridad</label>
      <input type="range" min="1" max="5" bind:value={prioridad} />
      <span class="prioridad-label">{prioridad}</span>
    </div>
    <div class="form-row">
      <label>Tipo</label>
      <select bind:value={tipo}>
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
    <StatusMessage type="error" message={error} on:close={() => error = null} />
  {/if}
  {#if success}
    <StatusMessage type="success" message={success} on:close={() => success = null} />
  {/if}

  <hr />

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
</section>

<style>
.goals-page {
  max-width: 520px;
  margin: 2rem auto 3rem auto;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 6px 32px 0 rgba(58,99,81,0.08);
  padding: 2.5rem 2rem 2rem 2rem;
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
.goal-form label .required, .goal-form label[for][data-required]::after {
  content: '*';
  color: #c43b3b;
  margin-left: 2px;
  font-size: 1.05em;
  vertical-align: middle;
}
.goals-page h2, .goals-page h3 {
  color: #26332b;
  font-weight: 700;
  margin-bottom: 0.7rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
input, select {
  padding: 0.45rem 0.7rem;
  border-radius: 6px;
  border: 1px solid #c6d3c1;
  font-size: 1rem;
  background: #f6faf7;
}
input[type="range"] {
  width: 100%;
}
.prioridad-label {
  font-size: 0.95rem;
  color: #3A6351;
  margin-left: 0.5rem;
}
.btn-primary {
  background: linear-gradient(90deg,#3A6351 60%,#6ec177 100%);
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
hr {
  margin: 2.2rem 0 1.2rem 0;
  border: none;
  border-top: 1.5px solid #e6ece7;
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
  box-shadow: 0 2px 10px 0 rgba(58,99,81,0.04);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.goal-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.goal-type {
  background: #e1f2e3;
  color: #3A6351;
  border-radius: 5px;
  padding: 0.12rem 0.7rem;
  font-size: 0.95rem;
  font-weight: 500;
}
.goal-details {
  display: flex;
  flex-wrap: wrap;
  gap: 1.2rem;
  font-size: 0.98rem;
  color: #3A6351;
}
.goal-desc {
  color: #2d3a2e;
  font-size: 0.97rem;
  margin-top: 0.2rem;
  font-weight: 500;
}
.loading-bar {
  background: repeating-linear-gradient(90deg,#e1f2e3,#c6d3c1 10px,#e1f2e3 20px);
  border-radius: 8px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3A6351;
  font-weight: 600;
  margin: 1.5rem 0;
  animation: shimmer 1.2s infinite linear;
}
@keyframes shimmer {
  0% { background-position: -40px 0; }
  100% { background-position: 200px 0; }
}
.empty {
  color: #6e8f7a;
  text-align: center;
  margin: 1.5rem 0;
}
</style>
