from sqlalchemy.orm import Session
from app.models.prompt_template import PromptTemplate
from typing import Optional

def get_all_prompts(db: Session):
    return db.query(PromptTemplate).order_by(PromptTemplate.name).all()

def get_prompt_by_name(db: Session, name: str) -> Optional[PromptTemplate]:
    return db.query(PromptTemplate).filter(PromptTemplate.name == name).first()
