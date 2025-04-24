<script lang="ts">
  import { useForm, type FieldConfig, type FormOptions } from '../../utils/useForm';
  
  export let fields: Record<string, FieldConfig> = {};
  export let options: FormOptions = {};
  export let id: string = '';
  export let className: string = '';
  
  // Crear estado del formulario
  const form = useForm(fields, options);
  
  // Exportar el API del formulario para uso externo
  export { form };
  
  // Classes
  $: formClasses = ['form', className].filter(Boolean).join(' ');
</script>

<form {id} class={formClasses} on:submit|preventDefault={form.handleSubmit}>
  <slot form={form}></slot>
</form>

<style>
  .form {
    width: 100%;
  }
</style> 