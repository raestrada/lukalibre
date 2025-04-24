# LukaLibre ZK App Frontend

Frontend para la aplicación LukaLibre ZK, una plataforma de educación financiera que utiliza tecnología Zero Knowledge para proteger la privacidad de los usuarios.

## Requisitos

- Node.js (v18 o superior)
- npm

## Configuración

1. Instala las dependencias:
   ```
   npm install
   ```

2. Configura las variables de entorno:

   - Para desarrollo: crea o edita el archivo `.env` en la raíz del proyecto
   - Para producción: crea o edita el archivo `.env.production`

   Ejemplo de contenido:
   ```
   VITE_API_BASE_URL=/api/v1
   VITE_API_BASE_URL=http://localhost:8000  # Para desarrollo
   # VITE_API_BASE_URL=https://api.lukalibre.com  # Para producción
   ```

## Desarrollo

Para iniciar el servidor de desarrollo:

```
npm run dev
```

Esto iniciará el servidor en `http://localhost:5173` con recarga en caliente.

## Construcción para producción

Para construir la aplicación para producción:

```
npm run build
```

Los archivos generados se almacenarán en el directorio `dist/`.

## Estructura del proyecto

- `src/components/`: Componentes Svelte de la aplicación
- `src/services/`: Servicios para comunicación con el backend
- `src/stores/`: Tiendas Svelte para manejo de estado
- `public/`: Archivos estáticos (imágenes, iconos, etc.)

## Configuración del proxy

En desarrollo, las solicitudes a `/api` se redirigen al backend especificado en `VITE_API_BASE_URL` gracias a la configuración del proxy en `vite.config.ts`. Esto resuelve los problemas de CORS durante el desarrollo.
