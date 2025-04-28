from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    email: str


class TokenPayload(BaseModel):
    sub: Optional[int] = None
    email: Optional[str] = None
    exp: Optional[int] = None
