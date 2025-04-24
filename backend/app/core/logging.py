import logging
import sys
from typing import List, Tuple

from rich.console import Console
from rich.logging import RichHandler
from rich.theme import Theme

from app.core.config import settings


# Temas personalizados para los logs
custom_theme = Theme({
    "info": "dim cyan",
    "warning": "magenta",
    "error": "bold red",
    "critical": "bold white on red",
    "success": "bold green",
    "debug": "dim",
})

# Consola Rich con tema personalizado
console = Console(theme=custom_theme, highlight=True)

# Definir niveles de log y sus colores/estilos
LOG_LEVELS: List[Tuple[int, str, str]] = [
    (logging.DEBUG, "DEBUG", "debug"),
    (logging.INFO, "INFO", "info"),
    (logging.WARNING, "WARNING", "warning"),
    (logging.ERROR, "ERROR", "error"),
    (logging.CRITICAL, "CRITICAL", "critical"),
]


def get_logging_level() -> int:
    """Obtiene el nivel de logging desde la configuración o variables de entorno"""
    env_level = settings.LOG_LEVEL.upper() if hasattr(settings, 'LOG_LEVEL') else "INFO"
    
    for level, name, _ in LOG_LEVELS:
        if name == env_level:
            return level
    return logging.INFO


def setup_logging() -> None:
    """Configura los logs con Rich"""
    # Configuración básica de log
    level = get_logging_level()
    
    # Configurar el handler de Rich
    rich_handler = RichHandler(
        console=console,
        rich_tracebacks=True,
        markup=True,
        tracebacks_show_locals=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
        enable_link_path=True,
    )
    
    # Formato para los logs (mínimo para Rich ya que añade su propio formato)
    log_format = "%(name)s - %(message)s"
    
    # Configuración global
    logging.basicConfig(
        level=level,
        format=log_format,
        datefmt="[%X]",
        handlers=[rich_handler],
    )
    
    # Configurar loggers específicos
    loggers = [
        "uvicorn",
        "uvicorn.error",
        "uvicorn.access",
        "fastapi",
        "sqlalchemy.engine",
        "alembic",
        "app",
    ]
    
    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(level)
        # Remover handlers existentes y añadir el de Rich
        for handler in logger.handlers:
            logger.removeHandler(handler)
        logger.addHandler(rich_handler)
    
    # Log inicial para verificar configuración
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.debug(f"[bold green]Logging configurado con nivel: {logging.getLevelName(level)}[/]")


def get_logger(name: str) -> logging.Logger:
    """Obtiene un logger configurado con Rich"""
    logger = logging.getLogger(name)
    return logger 