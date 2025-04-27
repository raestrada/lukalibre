<script lang="ts">
  export let open = false;
  export let title = '';
  export let onClose: () => void = () => {};
</script>

{#if open}
  <div class="modal-backdrop" role="presentation" tabindex="-1" on:click={onClose}></div>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label={title}
    tabindex="0"
    on:keydown={(e) => { if (e.key === 'Escape') onClose(); }}
  >
    <div class="modal-header">
      <h2>{title}</h2>
      <button class="modal-close" aria-label="Cerrar" on:click={onClose}>
        <span class="material-icons">close</span>
      </button>
    </div>
    <div class="modal-body">
      <slot />
    </div>
  </div>
{/if}

<style>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.25);
  z-index: 1000;
}
.modal {
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: #f8fafc;
  border-radius: 12px;
  box-shadow: 0 8px 40px 0 rgba(25,40,80,0.25), 0 1.5px 8px 0 rgba(0,0,0,0.14);
  min-width: 340px;
  max-width: 95vw;
  max-height: 92vh;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1.5px solid #e3e8ee;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.2em 1.5em 1em 1.5em;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f8fa;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.2em;
  color: #1976d2;
}
.modal-close {
  background: none;
  border: none;
  color: #1976d2;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
}
.modal-body {
  padding: 1.5em;
  overflow-y: auto;
  background: #fff;
  border-radius: 0 0 12px 12px;
  border-top: 1px solid #e3e8ee;
  color: #1a2233;
  font-size: 1.05em;
  min-height: 40px;
}
</style>
