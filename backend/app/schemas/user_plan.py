from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class UserPlanBase(BaseModel):
    plan_name: str
    is_active: bool = True
    credits: int = 0


class UserPlanCreate(UserPlanBase):
    user_id: int


class UserPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    is_active: Optional[bool] = None
    credits: Optional[int] = None


class UserPlanInDBBase(UserPlanBase):
    id: Optional[int] = None
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class UserPlan(UserPlanInDBBase):
    pass


class UserPlanInDB(UserPlanInDBBase):
    pass
