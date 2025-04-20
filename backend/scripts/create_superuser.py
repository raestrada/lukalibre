import argparse
import logging
import sys

from app import crud
from app.db.session import SessionLocal
from app.schemas.user import UserCreate

# Configurar el logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_superuser(email: str, password: str, full_name: str):
    db = SessionLocal()
    try:
        # Verificar si el usuario ya existe
        user = crud.user.get_by_email(db, email=email)
        if user:
            logger.error(f"El usuario con email {email} ya existe")
            sys.exit(1)
        
        # Crear el usuario superadmin
        user_in = UserCreate(
            email=email,
            password=password,
            is_superuser=True,
            full_name=full_name,
        )
        crud.user.create(db, obj_in=user_in)
        logger.info(f"Superusuario {email} creado correctamente")
    finally:
        db.close()

def main():
    parser = argparse.ArgumentParser(description="Crear un superusuario")
    parser.add_argument("--email", required=True, help="Email del superusuario")
    parser.add_argument("--password", required=True, help="Contraseña del superusuario")
    parser.add_argument("--fullname", required=True, help="Nombre completo del superusuario")
    
    args = parser.parse_args()
    
    create_superuser(args.email, args.password, args.fullname)

if __name__ == "__main__":
    main() 