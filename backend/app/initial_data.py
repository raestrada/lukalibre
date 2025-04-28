import logging

from app.core.logging import setup_logging, get_logger
from app.db.init_db import init_db
from app.db.session import SessionLocal

# Configurar logs
setup_logging()
logger = get_logger("app.initial_data")


def init() -> None:
    logger.debug("Conectando a la base de datos...")
    db = SessionLocal()
    logger.debug("Inicializando datos...")
    init_db(db)
    db.close()


def main() -> None:
    logger.info("[bold cyan]====== CREANDO DATOS INICIALES ======[/]")
    try:
        init()
        logger.info("[bold green]✓ Datos iniciales creados con éxito[/]")
    except Exception as e:
        logger.error(f"[bold red]✗ Error al crear datos iniciales: {str(e)}[/]")
        raise e


if __name__ == "__main__":
    main()
