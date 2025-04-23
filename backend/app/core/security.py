from datetime import datetime, timedelta
from typing import Any, Union, Dict, Optional

from jose import jwt
from passlib.context import CryptContext
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
import httpx
from authlib.integrations.base_client.errors import MismatchingStateError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("app.core.security")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# OAuth setup
config = Config()
oauth = OAuth(config)

# Configuración de Google OAuth
oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    client_kwargs={
        "scope": "openid email profile",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "prompt": "consent"
    },
    compliance_fix=lambda client: client
)


ALGORITHM = "HS256"


def create_access_token(
    subject: Union[str, Any], data: Dict[str, Any] = None, expires_delta: timedelta = None
) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode = {"exp": expire, "sub": str(subject)}
    
    # Añadir datos adicionales si se proporcionan
    if data:
        to_encode.update(data)
        
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    logger.debug(f"Token JWT creado para usuario ID: {subject} (expira: {expire.isoformat()})")
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """Verifica un token JWT y devuelve su payload"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[ALGORITHM]
        )
        return payload
    except jwt.JWTError as e:
        logger.warning(f"Error al verificar token JWT: {str(e)}")
        raise e


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


async def get_google_user_info(token: str) -> Dict[str, Any]:
    """Obtiene la información del usuario de Google usando el token de acceso"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if response.status_code != 200:
            logger.error(f"Error al obtener información de usuario de Google: {response.text}")
            response.raise_for_status()
        
        user_info = response.json()
        logger.debug(f"Información de usuario obtenida de Google: {user_info['email']}")
        return user_info 