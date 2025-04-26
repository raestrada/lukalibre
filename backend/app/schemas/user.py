from typing import Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr


# Shared properties
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    full_name: Optional[str] = None
    google_id: Optional[str] = None
    google_avatar: Optional[str] = None
    is_developer: Optional[bool] = False
    dev_plan_active: Optional[bool] = False


# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str
    google_id: Optional[str] = None
    google_avatar: Optional[str] = None


# Properties to receive via API on update
class UserUpdate(UserBase):
    password: Optional[str] = None
    google_id: Optional[str] = None
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_avatar: Optional[str] = None
    last_login: Optional[datetime] = None


class UserInDBBase(UserBase):
    id: Optional[int] = None
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        orm_mode = True
        from_attributes = True


# Additional properties to return via API
class User(UserInDBBase):
    google_avatar: Optional[str] = None


# Additional properties stored in DB
class UserInDB(UserInDBBase):
    hashed_password: str
    google_access_token: Optional[str] = None
    google_refresh_token: Optional[str] = None
    google_avatar: Optional[str] = None 