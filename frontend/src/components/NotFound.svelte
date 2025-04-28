<script lang="ts">
  export let message = 'Página no encontrada';
</script>

<div class="not-found">
  <h1>404</h1>
  <h2>{message}</h2>
  <p>La página que buscas no existe o fue movida.</p>
  <a href="#/dashboard">Ir al Dashboard</a>
</div>

<style>
  .not-found {
    text-align: center;
    padding: 4rem 1rem;
  }
  .not-found h1 {
    font-size: 6rem;
    color: var(--primary, #00897b);
    margin-bottom: 0.5rem;
  }
  .not-found h2 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  .not-found a {
    display: inline-block;
    margin-top: 2rem;
    color: var(--primary, #00897b);
    text-decoration: underline;
    font-weight: bold;
  }
</style>
