from fastapi import FastAPI
from .user import router as user_router
from .llm import router as llm_router

def register_routes(app: FastAPI) -> None:
    app.include_router(user_router, prefix="/users")
    app.include_router(llm_router, prefix="/llm")
