import argparse
import logging
import sys

from app import crud
from app.core.logging import setup_logging, get_logger
from app.db.session import SessionLocal
from app.schemas.user import UserCreate

# Configurar logs
setup_logging()
logger = get_logger("app.scripts.create_superuser")

def create_superuser(email: str, password: str, full_name: str):
    logger.info(f"Intentando crear superusuario: {email}")
    
    db = SessionLocal()
    try:
        # Verificar si el usuario ya existe
        user = crud.user.get_by_email(db, email=email)
        if user:
            logger.error(f"[bold red]✗ El usuario con email {email} ya existe[/]")
            sys.exit(1)
        
        # Crear el usuario superadmin
        user_in = UserCreate(
            email=email,
            password=password,
            is_superuser=True,
            full_name=full_name,
        )
        crud.user.create(db, obj_in=user_in)
        logger.info(f"[bold green]✓ Superusuario {email} creado correctamente[/]")
    except Exception as e:
        logger.error(f"[bold red]✗ Error al crear superusuario: {str(e)}[/]")
        sys.exit(1)
    finally:
        db.close()

def main():
    logger.info("[bold cyan]====== CREACIÓN DE SUPERUSUARIO ======[/]")
    
    parser = argparse.ArgumentParser(description="Crear un superusuario")
    parser.add_argument("--email", required=True, help="Email del superusuario")
    parser.add_argument("--password", required=True, help="Contraseña del superusuario")
    parser.add_argument("--fullname", required=True, help="Nombre completo del superusuario")
    
    args = parser.parse_args()
    
    create_superuser(args.email, args.password, args.fullname)

if __name__ == "__main__":
    main() 