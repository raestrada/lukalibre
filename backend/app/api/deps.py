from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.core import security
from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import SessionLocal

logger = get_logger("app.api.deps")

reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/login/access-token"
)


def get_db() -> Generator:
    logger.debug("Abriendo nueva sesión de base de datos")
    try:
        db = SessionLocal()
        yield db
    finally:
        logger.debug("Cerrando sesión de base de datos")
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(reusable_oauth2)
) -> models.User:
    try:
        logger.debug("Decodificando token JWT propio del backend")
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        logger.warning(f"Error al validar JWT propio: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No se pudieron validar las credenciales",
        )

    logger.debug(f"Buscando usuario con ID: {token_data.sub}")
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        logger.warning(f"Usuario con ID {token_data.sub} no encontrado")
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    logger.debug(f"Usuario autenticado: {user.email}")
    return user


from fastapi import Request

from fastapi import Header, Request


def get_current_user_bypass(
    x_debug_bypass: str = Header(None),
    db: Session = Depends(get_db),
    token: str = Depends(reusable_oauth2),
    request: Request = None,
) -> models.User:
    # Permitir bypass solo si:
    # - DEBUG está activo
    # - Header X-Debug-Bypass es '1'
    # - Host remoto es localhost
    if settings.DEBUG and x_debug_bypass == "1" and request is not None:
        client_host = request.client.host
        backend_hosts = [
            getattr(settings, "SERVER_HOST", "http://localhost:8000"),
            getattr(settings, "SERVER_NAME", "localhost"),
        ]
        # Considerar solo el host sin protocolo ni puerto
        backend_is_local = any(
            h.replace("http://", "").replace("https://", "").split(":")[0]
            in ("127.0.0.1", "localhost")
            for h in backend_hosts
        )
        if client_host in ("127.0.0.1", "::1", "localhost") and backend_is_local:
            from app.models.user import User

            return User(
                id=0,
                full_name="Debug User",
                email="debug@local",
                hashed_password="",
                is_active=True,
                is_superuser=True,
            )
    return get_current_user(db=db, token=token)


def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not crud.user.is_active(current_user):
        logger.warning(f"Intento de acceso con usuario inactivo: {current_user.email}")
        raise HTTPException(status_code=400, detail="Inactive user")
    logger.debug(f"Usuario activo verificado: {current_user.email}")
    return current_user


def get_current_active_superuser(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    if not crud.user.is_superuser(current_user):
        logger.warning(
            f"Usuario sin privilegios intentando acceso: {current_user.email}"
        )
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    logger.debug(f"Superusuario verificado: {current_user.email}")
    return current_user
