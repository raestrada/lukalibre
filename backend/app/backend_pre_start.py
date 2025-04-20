import logging

from tenacity import after_log, before_log, retry, stop_after_attempt, wait_fixed

from app.core.logging import setup_logging, get_logger
from app.db.session import SessionLocal

# Configurar logs
setup_logging()
logger = get_logger("app.startup")

max_tries = 60 * 5  # 5 minutes
wait_seconds = 1


@retry(
    stop=stop_after_attempt(max_tries),
    wait=wait_fixed(wait_seconds),
    before=before_log(logger, logging.INFO),
    after=after_log(logger, logging.WARN),
)
def init() -> None:
    try:
        db = SessionLocal()
        # Try to create session to check if DB is awake
        db.execute("SELECT 1")
        logger.debug("Conexión a base de datos establecida")
    except Exception as e:
        logger.error(f"[bold red]Error al conectar con la base de datos: {str(e)}[/]")
        raise e


def main() -> None:
    logger.info("[bold blue]Inicializando verificación previa del servicio[/]")
    init()
    logger.info("[bold green]Verificación previa completada con éxito[/]")


if __name__ == "__main__":
    main() 