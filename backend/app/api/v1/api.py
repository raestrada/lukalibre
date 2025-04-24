from fastapi import APIRouter

from app.api.v1.endpoints import login, users, auth, llm_proxy

api_router = APIRouter()
api_router.include_router(login.router, tags=["login"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"]) 
api_router.include_router(llm_proxy.router, prefix="/llm", tags=["llm"])