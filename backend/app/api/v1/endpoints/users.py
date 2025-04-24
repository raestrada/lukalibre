from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps
from app.core.logging import get_logger

logger = get_logger("app.api.users")
router = APIRouter()


@router.get("/", response_model=List[schemas.User])
def read_users(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Retrieve users.
    """
    logger.debug(f"Listado de usuarios solicitado (skip={skip}, limit={limit})")
    users = crud.user.get_multi(db, skip=skip, limit=limit)
    logger.debug(f"Se obtuvieron {len(users)} usuarios de la base de datos")
    return users


@router.post("/", response_model=schemas.User)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: schemas.UserCreate,
    current_user: models.User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create new user.
    """
    logger.debug("Solicitud de creación de usuario recibida")
    
    user = crud.user.get_by_email(db, email=user_in.email)
    if user:
        logger.warning(f"Intento de crear usuario duplicado: {user_in.email}")
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    
    user = crud.user.create(db, obj_in=user_in)
    logger.debug("Usuario creado exitosamente")
    return user


@router.get("/me", response_model=schemas.User)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    logger.debug("Usuario accediendo a sus propios datos")
    return current_user 