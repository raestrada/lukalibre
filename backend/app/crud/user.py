from typing import Any, Dict, Optional, Union

from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

logger = get_logger("app.crud.user")


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        logger.debug(f"Buscando usuario por email: {email}")
        return db.query(User).filter(User.email == email).first()

    def create(self, db: Session, *, obj_in: UserCreate) -> User:
        logger.debug(f"Creando nuevo usuario: {obj_in.email}")
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_superuser=obj_in.is_superuser,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        logger.debug(f"Usuario creado con ID: {db_obj.id}")
        return db_obj

    def update(
        self, db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        logger.debug(f"Actualizando usuario: {db_obj.email}")
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
            logger.debug("Contraseña actualizada")

        updated_user = super().update(db, db_obj=db_obj, obj_in=update_data)
        logger.debug(f"Usuario {updated_user.email} actualizado correctamente")
        return updated_user

    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        logger.debug(f"Intentando autenticar usuario: {email}")
        user = self.get_by_email(db, email=email)
        if not user:
            logger.debug(f"Usuario no encontrado: {email}")
            return None
        if not verify_password(password, user.hashed_password):
            logger.debug(f"Contraseña incorrecta para usuario: {email}")
            return None
        logger.debug(f"Autenticación exitosa para usuario: {email}")
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser


user = CRUDUser(User)
