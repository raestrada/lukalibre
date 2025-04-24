from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.schemas.prompt_template import PromptTemplateOut
from app.crud import crud_prompt_template
from typing import List

router = APIRouter()

@router.get("/", response_model=List[PromptTemplateOut])
def list_prompts(db: Session = Depends(get_db)):
    return crud_prompt_template.get_all_prompts(db)

@router.get("/{name}", response_model=PromptTemplateOut)
def get_prompt(name: str, db: Session = Depends(get_db)):
    prompt = crud_prompt_template.get_prompt_by_name(db, name)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt
