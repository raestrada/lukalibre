from pydantic import BaseModel
from typing import Optional

class PromptTemplateOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    template: str

    class Config:
        orm_mode = True
