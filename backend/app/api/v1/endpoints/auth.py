from datetime import datetime, timedelta
from uuid import uuid4
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse

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
    form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    logger.debug(f"Intento de inicio de sesión para usuario: {form_data.username}")
    user = crud.user.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        logger.warning(f"Intento de inicio de sesión fallido para usuario: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )
    elif not crud.user.is_active(user):
        logger.warning(f"Intento de inicio de sesión con cuenta inactiva: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Usuario inactivo"
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
    
    logger.info(f"Inicio de sesión exitoso para usuario: {user.email}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email
    }


@router.post("/login/test-token", response_model=schemas.User)
def test_token(current_user: models.User = Depends(deps.get_current_user)) -> Any:
    """
    Test access token
    """
    return current_user


@router.get("/google/authorize")
async def authorize_google(request: Request):
    """
    Redirige al usuario a la página de autenticación de Google
    """
    logger.debug("Iniciando autorización de Google OAuth")
    return await oauth.google.authorize_redirect(request, settings.GOOGLE_REDIRECT_URI)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    response: Response,
    db: Session = Depends(deps.get_db)
) -> Any:
    """
    Callback de autenticación de Google para procesar el código de autorización
    """
    logger.debug("Procesando callback de Google OAuth")
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        logger.error(f"Error al obtener token de acceso de Google: {str(e)}")
        # Redireccionar a frontend con error
        frontend_url = settings.CLIENT_FRONTEND_URL or "http://localhost:5173"
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=Error+al+procesar+la+autenticación"
        )
    
    # Obtener información del usuario de Google
    try:
        user_info = await security.get_google_user_info(token["access_token"])
    except Exception as e:
        logger.error(f"Error al obtener información de usuario de Google: {str(e)}")
        # Redireccionar a frontend con error
        frontend_url = settings.CLIENT_FRONTEND_URL or "http://localhost:5173"
        return RedirectResponse(
            url=f"{frontend_url}/auth/callback?error=No+se+pudo+obtener+la+información+del+usuario"
        )
    
    # Verificar si el usuario ya existe
    user = crud.user.get_by_email(db, email=user_info["email"])
    
    if not user:
        # Crear un nuevo usuario
        logger.info(f"Creando nuevo usuario con Google OAuth: {user_info['email']}")
        user_in = schemas.UserCreate(
            email=user_info["email"],
            password=uuid4().hex,  # Contraseña aleatoria que no se usará
            full_name=user_info.get("name", ""),
            google_id=user_info["sub"],
            is_active=True,
        )
        user = crud.user.create(db, obj_in=user_in)
    else:
        # Actualizar Google ID si no existe
        if not user.google_id:
            logger.info(f"Actualizando Google ID para usuario existente: {user.email}")
            user_update = {"google_id": user_info["sub"]}
            user = crud.user.update(db, db_obj=user, obj_in=user_update)
    
    # Actualizar tokens de Google y hora de último login
    user_update = {
        "google_access_token": token.get("access_token"),
        "google_refresh_token": token.get("refresh_token"),
        "last_login": datetime.now()
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
    
    # Configurar refresh token como cookie HTTP-only
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.SERVER_NAME != "localhost",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    # Redireccionar al frontend con el token
    frontend_url = settings.CLIENT_FRONTEND_URL or "http://localhost:5173"
    logger.info(f"Inicio de sesión con Google exitoso para usuario: {user.email}")
    return RedirectResponse(
        url=f"{frontend_url}/auth/callback?token={access_token}&user_id={user.id}&email={user.email}"
    )


@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(
    request: Request, 
    response: Response,
    db: Session = Depends(deps.get_db)
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
            logger.warning("Intento de actualización con token no válido como refresh token")
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
            logger.warning(f"Usuario no encontrado para refresh token: {user_id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Usuario no encontrado",
            )
        
        if not crud.user.is_active(user):
            logger.warning(f"Intento de refresh token para usuario inactivo: {user.email}")
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
        
        logger.info(f"Token actualizado exitosamente para usuario: {user.email}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email
        }
    
    except (jwt.JWTError, jwt.ExpiredSignatureError) as e:
        logger.warning(f"Error al verificar refresh token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
        ) 