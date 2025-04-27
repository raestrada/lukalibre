<script lang="ts">
  // Importamos los iconos de Feather que vamos a utilizar
  import { 
    CloudOff, CloudCheck, ArrowDown, ArrowUp, RefreshCw,
    ChevronDown, ChevronUp, Download, Upload, Power,
    Database, Maximize, AlertCircle
  } from 'feather-icons';
  
  // Nombre del icono que queremos mostrar
  export let name: string;
  // Tamaño del icono (por defecto 16px)
  export let size: number = 16;
  // Color (opcional)
  export let color: string = "currentColor";
  // Clase CSS adicional
  export let className: string = "";
  // Permitir estilos inline
  export let style: string = "";
  
  // Mapeo de nombres a objetos de iconos
  const icons = {
    "cloud-off": CloudOff,
    "cloud-check": CloudCheck,
    "arrow-down": ArrowDown,
    "arrow-up": ArrowUp,
    "refresh": RefreshCw,
    "chevron-down": ChevronDown,
    "chevron-up": ChevronUp,
    "download": Download,
    "upload": Upload,
    "power": Power,
    "database": Database,
    "maximize": Maximize,
    "alert-circle": AlertCircle
  };
  
  // Convertir el objeto de icono a HTML
  function getIconHtml(iconName: string): string {
    const iconObject = icons[iconName as keyof typeof icons];
    
    if (!iconObject) {
      console.error(`Icono '${iconName}' no encontrado`);
      return '';
    }
    
    return iconObject.toSvg({
      width: size,
      height: size,
      color: color,
      class: className
    });
  }
  
  // HTML del icono
  $: iconHtml = getIconHtml(name);
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<span class="icon {className}" on:click style="display: inline-flex; align-items: center; {style}" aria-hidden="true">
  {@html iconHtml}
</span>

<style>
  .icon {
    vertical-align: middle;
    line-height: 1;
  }
</style> 