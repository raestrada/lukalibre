from fastapi import FastAPI
from rich import print as rprint

def create_app() -> FastAPI:
    app = FastAPI(title="LukaLibre ZK Backend")
    from .routes import register_routes
    register_routes(app)
    rprint("[bold green]🚀 LukaLibre backend up and running[/]")
    return app

app = create_app()
