import logging

from sqlalchemy.orm import Session

from app import crud, schemas
from app.core.config import settings
from app.core.logging import get_logger
from app.db import base  # noqa: F401

logger = get_logger("app.db.init")


# make sure all SQL Alchemy models are imported (app.db.base) before initializing DB
# otherwise, SQL Alchemy might fail to initialize relationships properly


def init_db(db: Session) -> None:
    # Tables should be created with Alembic migrations
    # But if you don't want to use migrations, create
    # the tables un-commenting the next line
    # Base.metadata.create_all(bind=engine)

    logger.info("Verificando si existe el superusuario inicial...")
    user = crud.user.get_by_email(db, email=settings.FIRST_SUPERUSER)
    if not user:
        logger.info(f"Superusuario no encontrado. Creando usuario con email: {settings.FIRST_SUPERUSER}")
        user_in = schemas.UserCreate(
            email=settings.FIRST_SUPERUSER,
            password=settings.FIRST_SUPERUSER_PASSWORD,
            is_superuser=True,
            full_name="Superusuario Inicial",
        )
        user = crud.user.create(db, obj_in=user_in)
        logger.info("[bold green]✓ Superusuario creado con éxito[/]")
    else:
        logger.info("[yellow]El superusuario ya existe, omitiendo creación[/]") 