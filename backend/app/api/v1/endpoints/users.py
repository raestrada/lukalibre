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


@router.get("/plan")
def get_user_plan(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    """
    Devuelve el plan activo y créditos del usuario autenticado.
    Si es desarrollador y tiene el plan activo, devuelve plan especial ilimitado.
    """
    if getattr(current_user, "is_developer", False) and getattr(current_user, "dev_plan_active", False):
        return {
            "id": None,
            "user_id": current_user.id,
            "plan_name": "Desarrollador LukaLibre",
            "is_active": True,
            "credits": None,  # ilimitados
            "created_at": None,
            "updated_at": None,
            "developer": True,
            "is_developer": True,
            "dev_plan_active": True
        }
    from app.crud import crud_user_plan
    plan = crud_user_plan.get_active_plan(db, current_user.id)
    if not plan:
        return {
            "id": None,
            "user_id": current_user.id,
            "plan_name": None,
            "is_active": False,
            "credits": 0,
            "created_at": None,
            "updated_at": None,
            "developer": getattr(current_user, "is_developer", False),
            "is_developer": getattr(current_user, "is_developer", False),
            "dev_plan_active": getattr(current_user, "dev_plan_active", False)
        }
    return {
        "id": plan.id,
        "user_id": plan.user_id,
        "plan_name": plan.plan_name,
        "is_active": plan.is_active,
        "credits": plan.credits,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at,
        "developer": getattr(current_user, "is_developer", False),
        "is_developer": getattr(current_user, "is_developer", False),
        "dev_plan_active": getattr(current_user, "dev_plan_active", False)
    }