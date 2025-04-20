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
        logger.debug("Decodificando token JWT")
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[security.ALGORITHM]
        )
        token_data = schemas.TokenPayload(**payload)
    except (jwt.JWTError, ValidationError) as e:
        logger.warning(f"Error al validar token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )
    
    logger.debug(f"Buscando usuario con ID: {token_data.sub}")
    user = crud.user.get(db, id=token_data.sub)
    if not user:
        logger.warning(f"Usuario con ID {token_data.sub} no encontrado")
        raise HTTPException(status_code=404, detail="User not found")
    
    logger.debug(f"Usuario autenticado: {user.email}")
    return user


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
        logger.warning(f"Usuario sin privilegios intentando acceso: {current_user.email}")
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    logger.debug(f"Superusuario verificado: {current_user.email}")
    return current_user 