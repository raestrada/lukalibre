from sqlalchemy.orm import Session
from app.models.user_plan import UserPlan
from typing import Optional
from datetime import datetime

def get_active_plan(db: Session, user_id: int) -> Optional[UserPlan]:
    return db.query(UserPlan).filter(
        UserPlan.user_id == user_id,
        UserPlan.is_active == True
    ).order_by(UserPlan.created_at.desc()).first()

def has_credits(db: Session, user_id: int) -> bool:
    plan = get_active_plan(db, user_id)
    return plan is not None and plan.credits > 0

def consume_credit(db: Session, user_id: int) -> bool:
    plan = get_active_plan(db, user_id)
    if plan and plan.credits > 0:
        plan.credits -= 1
        plan.updated_at = datetime.utcnow()
        db.commit()
        return True
    return False

def get_plan_info(db: Session, user_id: int) -> Optional[UserPlan]:
    return get_active_plan(db, user_id)
