# Backend de LukaLibre

[![Backend CI](https://github.com/raestrada/lukalibre/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/raestrada/lukalibre/actions/workflows/backend-ci.yml)

Backend para la plataforma de educación financiera LukaLibre, construido con FastAPI, SQLAlchemy, PostgreSQL y OpenRouter. Proporciona APIs RESTful para la autenticación de usuarios, gestión de datos y proxy inteligente para servicios de IA.

## Características principales

- **API RESTful**: Interfaces para autenticación y gestión de recursos
- **Modelos avanzados**: Esquemas de datos para finanzas personales chilenas
- **Proxy LLM**: Integración exclusiva con OpenRouter para acceso cost-optimizado a múltiples modelos IA
- **Modelos Especializados**:
  - `qwen/qwen3-coder` para análisis de texto y generación de código/SQL
  - `google/gemini-2.5-flash` para procesamiento de imágenes con capacidades de visión
- **Seguridad**: Autenticación JWT, protección CORS, rate limiting
- **OAuth2**: Integración con proveedores como Google

## Requisitos

- Python 3.12+
- PostgreSQL
- [Poetry](https://python-poetry.org/) para gestión de dependencias
- Docker (opcional, para entorno de desarrollo)

## Instalación

1. Instalar dependencias:

```bash
cd backend
poetry install
```

2. Configurar variables de entorno:

Copia el archivo `.env.example` a `.env` y modifica los valores según tu entorno.

### Configuración de OpenRouter

El backend requiere configuración de OpenRouter para las funcionalidades de IA:

```bash
# Variables requeridas en .env
OPENROUTER_API_KEY=tu_api_key_de_openrouter
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
TEXT_MODEL=qwen/qwen3-coder
IMAGE_MODEL=google/gemini-2.5-flash
```

**Obtener API Key:**
1. Registrarse en [openrouter.ai](https://openrouter.ai/)
2. Crear una nueva API key en la sección de configuración
3. Agregar créditos a la cuenta para usar modelos premium

## Base de datos

Puedes usar Docker para levantar rápidamente una instancia de PostgreSQL:

```bash
# Desde la raíz del proyecto
docker-compose up -d
```

### Migraciones con Alembic

El proyecto utiliza Alembic para gestionar las migraciones de la base de datos:

```bash
# Detecta cambios en los modelos y genera una migración
poetry run alembic revision --autogenerate -m "descripción del cambio"

# Aplica todas las migraciones pendientes
poetry run alembic upgrade head

# Revierte la última migración
poetry run alembic downgrade -1
```

### Inicialización de datos

Para crear un superusuario inicial:

```bash
# Usando el script automatizado (toma valores del config.py)
poetry run python -m app.initial_data
```

## Ejecutar el servidor

```bash
# Desarrollo con recarga automática
poetry run uvicorn app.main:app --reload
```

## Calidad de código

El proyecto utiliza:

- **Black**: Formateo de código automático
- **Flake8**: Linting y análisis estático
- **Bandit**: Análisis de seguridad
- **mypy**: Verificación de tipos
- **Pre-commit hooks**: Verificación automática antes de cada commit

Para ejecutar formateo manual:

```bash
poetry run black .
```

Para ejecutar el conjunto completo de verificaciones:

```bash
poetry run pre-commit run --all-files
```

## Documentación API

Una vez que el servidor esté en ejecución, puedes acceder a:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Tests

Para ejecutar las pruebas:

```bash
poetry run pytest
```

Para generar un informe de cobertura:

```bash
poetry run pytest --cov=app --cov-report=html
```
