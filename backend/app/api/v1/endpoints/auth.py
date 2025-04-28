from datetime import datetime, timedelta
from uuid import uuid4
from typing import Any, Optional
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
import httpx

from app import crud, models, schemas
from app.api import deps
from app.core import security
from app.core.config import settings
from app.core.security import oauth
from app.core.logging import get_logger

router = APIRouter()
logger = get_logger("app.api.v1.endpoints.auth")


@router.post("/login/access-token", response_model=schemas.Token)
def login_access_token(
    response: Response,
    db: Session = Depends(deps.get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.debug("Intento de inicio de sesión")
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        logger.warning("Intento de inicio de sesión fallido")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    elif not crud.user.is_active(user):
        logger.warning("Intento de inicio de sesión con cuenta inactiva")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Usuario inactivo"
        )

    # Actualizar tiempo de último login
    user_update = {"last_login": datetime.now()}
    user = crud.user.update(db, db_obj=user, obj_in=user_update)

    # Crear access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, data={"email": user.email}, expires_delta=access_token_expires
    )

    # Crear refresh token
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = security.create_access_token(
        user.id, data={"type": "refresh"}, expires_delta=refresh_token_expires
    )

    # Configurar refresh token como cookie HTTP-only
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.SERVER_NAME != "localhost",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )

    logger.debug("Inicio de sesión exitoso")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
    }


@router.post("/login/test-token", response_model=schemas.User)
def test_token(current_user: models.User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    # Registrar el estado del usuario para depuración
    logger.debug(
        f"Usuario autenticado: {current_user.email}, Avatar: {current_user.google_avatar}"
    )
    return current_user


@router.get("/google/authorize")
async def authorize_google(request: Request):
    """
    Redirige al usuario a la página de autenticación de Google
    """
    logger.debug("Iniciando autorización de Google OAuth")
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback", include_in_schema=False)
async def google_auth_callback(
    request: Request,
    code: Optional[str] = None,
    access_token: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Maneja el callback de autenticación de Google OAuth y redirige al frontend
    con el token de acceso en el fragmento URL (para que sea accesible mediante JavaScript).
    """
    logger.info("Procesando callback de Google OAuth para Google Drive")

    # Construir la URL de redirección al frontend
    frontend_url = f"http://localhost:5173/auth/google/callback"

    # Si hay un error, redirigir inmediatamente con el error
    if error:
        logger.error(f"Error en la autenticación OAuth: {error}")
        return RedirectResponse(
            url=f"{frontend_url}#error={error}&error_description=Error+en+autenticación+de+Google"
        )

    # Si tenemos un código, intercambiarlo por un token
    if code:
        try:
            logger.info("Código de autorización recibido, intercambiando por token")

            # Intercambiar código por token
            client = oauth.google
            token_endpoint = client.server_metadata.get("token_endpoint")

            if not token_endpoint:
                logger.error("Error: No se encontró el endpoint de token")
                return RedirectResponse(
                    url=f"{frontend_url}#error=server_error&error_description=Error+de+configuración+del+servidor"
                )

            # Construir los datos para la solicitud de token
            token_data = {
                "client_id": client.client_id,
                "client_secret": client.client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            }

            # Hacer una solicitud POST al endpoint de token
            async with httpx.AsyncClient() as http_client:
                token_response = await http_client.post(token_endpoint, data=token_data)

                if token_response.status_code != 200:
                    logger.error(f"Error al obtener token: {token_response.text}")
                    return RedirectResponse(
                        url=f"{frontend_url}#error=token_error&error_description=Error+al+obtener+token"
                    )

                token_data = token_response.json()
                access_token = token_data.get("access_token")

                if not access_token:
                    logger.error("No se recibió access_token en la respuesta")
                    return RedirectResponse(
                        url=f"{frontend_url}#error=missing_token&error_description=No+se+recibió+token+en+la+respuesta"
                    )

                logger.info("Token obtenido correctamente")

                # Obtener información del usuario de Google
                user_info = await security.get_google_user_info(access_token)
                logger.info(f"Usuario autenticado con Google: {user_info['email']}")

                # Buscar o crear usuario en la base de datos
                from app import crud, models, schemas
                from app.api.deps import get_db

                db = next(get_db())
                user = crud.user.get_by_email(db, email=user_info["email"])
                if not user:
                    user_in = schemas.user.UserCreate(
                        email=user_info["email"],
                        password=secrets.token_urlsafe(
                            16
                        ),  # Contraseña aleatoria (no se usará)
                        full_name=user_info.get("name", ""),
                        google_id=user_info.get("sub"),
                        google_avatar=user_info.get("picture", None),
                    )
                    user = crud.user.create(db, obj_in=user_in)
                else:
                    # Actualizar datos de Google si cambian
                    update_data = {}
                    if user.google_id != user_info.get("sub"):
                        update_data["google_id"] = user_info.get("sub")
                    if user.google_avatar != user_info.get("picture"):
                        update_data["google_avatar"] = user_info.get("picture")
                    if update_data:
                        user = crud.user.update(db, db_obj=user, obj_in=update_data)

                # Generar JWT propio
                jwt_token = security.create_access_token(
                    subject=user.id,
                    data={
                        "email": user.email,
                        "full_name": user.full_name,
                        "is_superuser": user.is_superuser,
                        "google_id": user.google_id,
                        "google_avatar": user.google_avatar,
                    },
                )
                logger.info(
                    "JWT propio generado para el usuario autenticado con Google"
                )

                # Redireccionar al frontend con el JWT propio
                return RedirectResponse(
                    url=f"{frontend_url}#access_token={jwt_token}&state={state or 'googleDriveAuth'}"
                )

        except Exception as e:
            logger.error(f"Error al procesar el código de autorización: {str(e)}")
            return RedirectResponse(
                url=f"{frontend_url}#error=server_error&error_description={str(e).replace(' ', '+')}"
            )

    # Si ya tenemos un token, simplemente redirigir con él
    if access_token:
        logger.info("Token recibido directamente, redirigiendo al frontend")
        return RedirectResponse(
            url=f"{frontend_url}#access_token={access_token}&state={state or 'googleDriveAuth'}"
        )

    # Si no hay token ni código, buscar en el fragmento URL
    full_url = str(request.url)
    if "#" in full_url:
        logger.info("Encontrado fragmento en la URL")
        fragment = full_url.split("#")[1]
        return RedirectResponse(url=f"{frontend_url}#{fragment}")

    # Si no hay nada de lo anterior, enviar un error
    logger.error("No se encontró token, código ni fragmento")
    return RedirectResponse(
        url=f"{frontend_url}#error=missing_token&error_description=No+se+recibió+información+de+autenticación"
    )


@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(
    request: Request, response: Response, db: Session = Depends(deps.get_db)
) -> Any:
    """
    Actualizar el token de acceso usando el refresh token
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        logger.warning("Intento de actualización de token sin refresh token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token no proporcionado",
        )

    try:
        payload = security.verify_token(refresh_token)
        # Verificar que es un refresh token
        if payload.get("type") != "refresh":
            logger.warning(
                "Intento de actualización con token no válido como refresh token"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido para refresh",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido",
            )

        user = crud.user.get(db, id=int(user_id))
        if not user:
            logger.warning("Usuario no encontrado para refresh token")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )

        if not crud.user.is_active(user):
            logger.warning("Intento de refresh token para usuario inactivo")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuario inactivo",
            )

        # Crear nuevo access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = security.create_access_token(
            user.id, data={"email": user.email}, expires_delta=access_token_expires
        )

        # Crear nuevo refresh token
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_refresh_token = security.create_access_token(
            user.id, data={"type": "refresh"}, expires_delta=refresh_token_expires
        )

        # Configurar refresh token como cookie HTTP-only
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=settings.SERVER_NAME != "localhost",
            samesite="strict",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )

        logger.debug("Token actualizado exitosamente")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email,
        }

    except (jwt.JWTError, jwt.ExpiredSignatureError) as e:
        logger.warning(f"Error al verificar refresh token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        )


@router.post("/google-callback")
async def google_callback_post(
    request: Request,
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(deps.get_db),
) -> Any:
    """
    Procesa el código de autorización de Google a través de una solicitud POST
    """
    logger.info("Procesando callback de Google OAuth (POST)")

    try:
        # En lugar de usar authorize_access_token que verifica el state,
        # usar llamadas directas a la API de Google para intercambiar el código por un token
        client = oauth.google

        # Obtener token de Google directamente usando el código de autorización
        token_endpoint = client.server_metadata.get("token_endpoint")
        if not token_endpoint:
            logger.error(
                "Error de configuración OAuth: No se encontró el endpoint de token"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error de configuración OAuth: No se encontró el endpoint de token",
            )

        # Construir los datos para la solicitud de token
        token_data = {
            "client_id": client.client_id,
            "client_secret": client.client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        }

        # Hacer una solicitud POST directa al endpoint de token de Google
        async with httpx.AsyncClient() as http_client:
            logger.debug(f"Enviando solicitud de token a Google: {token_endpoint}")
            token_response = await http_client.post(token_endpoint, data=token_data)

            if token_response.status_code != 200:
                error_message = f"Error en respuesta de token: {token_response.text}"
                logger.error(error_message)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No se pudo obtener el token de acceso de Google",
                )

            token = token_response.json()
            logger.info("Token de acceso obtenido correctamente de Google")
    except Exception as e:
        error_message = f"Error al obtener token de acceso de Google: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error al procesar la autenticación con Google: {str(e)}",
        )

    # Obtener información del usuario de Google
    try:
        logger.debug("Obteniendo información del usuario con el token de acceso")
        user_info = await security.get_google_user_info(token["access_token"])
        logger.info(f"Información de usuario obtenida: {user_info.get('email')}")
    except Exception as e:
        error_message = f"Error al obtener información de usuario de Google: {str(e)}"
        logger.error(error_message)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se pudo obtener la información del usuario",
        )

    # Verificar si el usuario ya existe
    user = crud.user.get_by_email(db, email=user_info["email"])

    if not user:
        # Crear un nuevo usuario
        logger.info(f"Creando nuevo usuario con Google OAuth: {user_info['email']}")
        user_in = schemas.UserCreate(
            email=user_info["email"],
            password=secrets.token_urlsafe(16),  # Contraseña aleatoria que no se usará
            full_name=user_info.get("name", ""),
            google_id=user_info["sub"],
            google_avatar=user_info.get("picture"),  # Guardar la URL del avatar
            is_active=True,
        )
        user = crud.user.create(db, obj_in=user_in)
    else:
        logger.info(f"Usuario existente encontrado: {user.email}")
        # Actualizar Google ID si no existe
        if not user.google_id:
            logger.debug(f"Actualizando Google ID para usuario: {user.email}")
            user_update = {"google_id": user_info["sub"]}
            user = crud.user.update(db, db_obj=user, obj_in=user_update)

    # Actualizar tokens de Google y hora de último login
    logger.debug(f"Actualizando tokens y datos de Google para usuario: {user.email}")
    user_update = {
        "google_access_token": token.get("access_token"),
        "google_refresh_token": token.get("refresh_token"),
        "google_avatar": user_info.get("picture"),  # Actualizar el avatar en cada login
        "last_login": datetime.now(),
    }
    user = crud.user.update(db, db_obj=user, obj_in=user_update)

    # Crear access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, data={"email": user.email}, expires_delta=access_token_expires
    )

    # Crear refresh token
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = security.create_access_token(
        user.id, data={"type": "refresh"}, expires_delta=refresh_token_expires
    )

    logger.info(f"Inicio de sesión con Google exitoso para: {user.email}")

    # Procesar la URL del avatar para la respuesta
    avatar_url = user_info.get("picture", "")
    if avatar_url:
        logger.debug(f"Avatar de Google encontrado: {avatar_url[:50]}...")
    else:
        logger.debug("No se encontró avatar en la información de Google")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email,
        "google_avatar": avatar_url,
    }
