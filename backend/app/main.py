from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import setup_logging, get_logger

# Configurar los logs antes de cualquier otra operación
setup_logging()
logger = get_logger("app.main")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set all CORS enabled origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    logger.info(f"CORS configurado para: {', '.join(str(origin) for origin in settings.BACKEND_CORS_ORIGINS)}")

app.include_router(api_router, prefix=settings.API_V1_STR)
logger.info(f"API montada en ruta: {settings.API_V1_STR}")


@app.get("/")
async def root():
    logger.info("Solicitud recibida en el endpoint raíz")
    return {"message": "Welcome to the Luka Libre API - Educación Financiera para Chile"}


@app.on_event("startup")
async def startup_event():
    logger.info("[bold green]¡Servidor iniciado correctamente![/]")
    logger.info(f"Aplicación '{settings.PROJECT_NAME}' en ejecución")
    if settings.DEBUG:
        logger.warning("[bold yellow]¡MODO DEBUG ACTIVADO! No usar en producción.[/]")


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("[bold red]Servidor detenido[/]") 