from datetime import datetime, timedelta
from typing import Any, Union

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.core.security")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Token JWT creado para usuario ID: {subject} (expira: {expire.isoformat()})")
    return encoded_jwt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    result = pwd_context.verify(plain_password, hashed_password)
    if result:
        logger.debug("Verificación de contraseña exitosa")
    else:
        logger.warning("Intento de verificación de contraseña fallido")
    return result


def get_password_hash(password: str) -> str:
    hashed = pwd_context.hash(password)
    logger.debug("Contraseña hasheada correctamente")
    return hashed 