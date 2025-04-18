#!/usr/bin/env bash
set -e

echo "🎨  Creando estructura LukaLibre: Svelte + FastAPI..."

#######################################
# FRONTEND – Svelte PWA con Vite
#######################################
echo "📦  Inicializando frontend PWA (Svelte)..."
rm -rf frontend && mkdir frontend
(
  cd frontend
  # ⚠️ Requiere npm 16+ y vite 4+. Comenta si ya tienes un proyecto.
  npm create vite@latest lukalibre-pwa -- --template svelte
  mv lukalibre-pwa/* .
  rm -rf lukalibre-pwa
  npm install
  # Carpeta para módulos de lógica
  mkdir -p src/{crypto,db,llm,services}
  touch src/crypto/crypto.ts          # Web Crypto helpers
  touch src/db/sqlite.ts              # sql.js / wa-sqlite wrapper
  touch src/llm/groq.ts               # llamada al proxy FastAPI
  touch src/services/drive.ts         # sync Google Drive
)

#######################################
# BACKEND – FastAPI + Poetry
#######################################
echo "🐍  Inicializando backend (FastAPI)..."
rm -rf backend && mkdir -p backend/app/{core,models,repositories,services,routes}
cd backend

# pyproject.toml minimal con Poetry
cat > pyproject.toml <<'PYPROJECT'
[tool.poetry]
name = "lukalibre-backend"
version = "0.1.0"
description = "Backend FastAPI for LukaLibre ZK App"
authors = ["Rodrigo Estrada <you@example.com>"]
license = "AGPL-3.0"

[tool.poetry.dependencies]
python = "^3.10"
fastapi = "^0.110"
uvicorn = "^0.27"
sqlalchemy = "^2.0"
rich = "^13.7"
python-dotenv = "^1.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
PYPROJECT

# Crear archivos base
cat > app/main.py <<'PY'
from fastapi import FastAPI
from rich import print as rprint

def create_app() -> FastAPI:
    app = FastAPI(title="LukaLibre ZK Backend")
    from .routes import register_routes
    register_routes(app)
    rprint("[bold green]🚀 LukaLibre backend up and running[/]")
    return app

app = create_app()
PY

# core/__init__.py con settings
cat > app/core/settings.py <<'PY'
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./lukalibre.db"
    groq_api_key: str = ""
    class Config:
        env_file = ".env"
settings = Settings()
PY

# routes/__init__.py
cat > app/routes/__init__.py <<'PY'
from fastapi import FastAPI
from .user import router as user_router
from .llm import router as llm_router

def register_routes(app: FastAPI) -> None:
    app.include_router(user_router, prefix="/users")
    app.include_router(llm_router, prefix="/llm")
PY

touch app/routes/{user.py,llm.py}
touch app/models/__init__.py
touch app/repositories/__init__.py
touch app/services/__init__.py

cd ..

#######################################
# Taskfile (dev runner)
#######################################
cat > Taskfile.yml <<'TASK'
version: '3'

tasks:
  default:
    cmds:
      - task --list
    silent: true

  backend:install:
    desc: Instala dependencias backend con Poetry
    dir: backend
    cmds:
      - poetry install

  backend:run:
    desc: Ejecuta FastAPI con autoreload
    dir: backend
    deps: [backend:install]
    cmds:
      - poetry run uvicorn app.main:app --reload

  frontend:dev:
    desc: Ejecuta Vite dev server
    dir: frontend
    cmds:
      - npm run dev -- --host

  fmt:
    desc: Formatea Python con black y JS/TS con prettier (si los tienes instalados)
    cmds:
      - echo "🔧 Formatting backend..."
      - black backend || true
      - echo "🔧 Formatting frontend..."
      - prettier -w frontend || true
TASK

#######################################
# Mensaje final
#######################################
echo "✅  Proyecto reestructurado:"
echo "   • frontend/  -> Svelte PWA"
echo "   • backend/   -> FastAPI + SQLAlchemy"
echo "   • Taskfile.yml con comandos útiles"
echo "   Ejecuta 'task frontend:dev' y 'task backend:run' para empezar. 🎉"
