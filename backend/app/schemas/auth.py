from typing import Optional, Dict, Any

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    email: Optional[str] = None
    exp: Optional[int] = None


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str
