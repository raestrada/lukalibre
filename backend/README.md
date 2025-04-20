# Backend de LukaLibre

Backend para la plataforma de educación financiera LukaLibre, construido con FastAPI y SQLAlchemy.

## Requisitos

- Python 3.11+
- PostgreSQL
- [Poetry](https://python-poetry.org/)

## Instalación

1. Instalar dependencias:

```bash
cd backend
poetry install
```

2. Configurar variables de entorno (opcional):

Copia el archivo `.env.example` a `.env` y modifica los valores según tu entorno.

## Base de datos

### Migraciones con Alembic

El proyecto utiliza Alembic para gestionar las migraciones de la base de datos:

#### Generar una nueva migración

```bash
# Detecta cambios en los modelos y genera una migración
poetry run alembic revision --autogenerate -m "descripción del cambio"
```

#### Aplicar migraciones

```bash
# Aplica todas las migraciones pendientes
poetry run alembic upgrade head
```

#### Revertir migraciones

```bash
# Revierte la última migración
poetry run alembic downgrade -1
```

### Inicialización de datos

Para crear un superusuario inicial:

```bash
# Usando el script automatizado (toma valores del config.py)
poetry run python -m app.initial_data

# O crear un superusuario personalizado:
poetry run python -m backend.scripts.create_superuser --email=admin@ejemplo.com --password=misecreto --fullname="Admin Ejemplo"
```

## Ejecutar el servidor

```bash
# Desarrollo con recarga automática
poetry run uvicorn app.main:app --reload

# O usando el script:
poetry run python -m app.main
```

## Documentación API

Una vez que el servidor esté en ejecución, puedes acceder a:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- OpenAPI JSON: http://localhost:8000/api/v1/openapi.json 