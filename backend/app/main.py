from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.responses import Response

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

# Add SessionMiddleware for OAuth authentication
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SECRET_KEY,
    max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
)
logger.info("SessionMiddleware configurado para autenticación OAuth")

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

# Add a custom middleware to ensure CORS headers are added
@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    try:
        response = await call_next(request)
        
        # Add CORS headers explicitly to ensure they're present
        response.headers["Access-Control-Allow-Origin"] = "http://localhost:5173"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        
        # Handle preflight OPTIONS requests
        if request.method == "OPTIONS":
            if not response.status_code == 200:
                return Response(
                    status_code=200,
                    headers=response.headers
                )
        
        return response
    except Exception as e:
        logger.error(f"Error in CORS middleware: {e}")
        # Return a simple error response to prevent unhandled exceptions
        return Response(
            status_code=500,
            content=f"Internal server error: {str(e)}",
            headers={
                "Access-Control-Allow-Origin": "http://localhost:5173",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With"
            }
        )

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