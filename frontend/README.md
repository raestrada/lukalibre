# LukaLibre ZK App

[![Frontend CI](https://github.com/raestrada/lukalibre/actions/workflows/frontend-ci.yml/badge.svg)](https://github.com/raestrada/lukalibre/actions/workflows/frontend-ci.yml)

Frontend para la aplicación LukaLibre, una plataforma de educación financiera que utiliza tecnología Zero-Knowledge para proteger la privacidad de los usuarios mediante el almacenamiento y procesamiento local de datos financieros.

## Características principales

- **Zero-Knowledge by Design**: Los datos del usuario nunca salen de su navegador
- **Base de datos SQLite local**: Utilizando SQL.js y almacenamiento persistente con localStorage
- **Dashboard financiero**: Visualización clara de datos y recomendaciones personalizadas
- **Integración con APIs LLM**: Generación de reportes y análisis utilizando IA
- **Sincronización opcional**: Sincronización cifrada con Google Drive (opcional para el usuario)

## Requisitos

- Node.js (v18 o superior)
- npm

## Configuración

1. Instala las dependencias:
   ```bash
   npm install
   ```

2. Configura las variables de entorno (opcional):

   - Para desarrollo: crea o edita el archivo `.env` en la raíz del proyecto
   - Para producción: crea o edita el archivo `.env.production`

   Ejemplo de contenido:
   ```
   VITE_API_BASE_URL=/api/v1
   VITE_API_BASE_URL=http://localhost:8000  # Para desarrollo
   # VITE_API_BASE_URL=https://api.lukalibre.com  # Para producción
   ```

## Scripts disponibles

```bash
# Desarrollo con recarga en caliente
npm run dev

# Construir para producción
npm run build

# Vista previa de la compilación
npm run preview

# Verificar tipos con TypeScript
npm run check

# Formatear todo el código (prettier, eslint, stylelint)
npm run format-all
```

## Base de datos local

El frontend utiliza SQL.js para implementar una base de datos SQLite que se ejecuta directamente en el navegador:

- Los datos se almacenan encriptados en localStorage
- El servicio SQLiteService gestiona la inicialización y persistencia
- Se incluye un botón de reset para reiniciar la BD cuando sea necesario

## Estructura del proyecto

- `src/components/`: Componentes Svelte organizados por funcionalidad
- `src/services/`: Servicios para lógica de negocio y comunicación API
  - `sqliteService.ts`: Gestión de la base de datos local
  - `llmService.ts`: Integración con modelos de lenguaje
- `src/stores/`: Estado global de la aplicación (Svelte stores)
- `src/utils/`: Utilidades y funciones helper

## Calidad de código

El proyecto utiliza las siguientes herramientas para asegurar la calidad del código:

- **ESLint**: Análisis estático de código
- **Prettier**: Formateo consistente
- **Stylelint**: Linting para archivos CSS
- **TypeScript**: Verificación de tipos
- **Pre-commit hooks**: Verificación automática antes de cada commit
- **GitHub Actions**: CI/CD automatizado
