from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.models.user_llm_limit import UserLLMLimit
from app.models.llm_request_log import LLMRequestLog

DEFAULT_LIMITS = {
    'per_minute': 5,
    'per_hour': 30,
    'per_day': 100,
    'per_week': 400,
    'per_month': 1000,
}

def get_user_limits(db: Session, user_id: int):
    limits = db.query(UserLLMLimit).filter(UserLLMLimit.user_id == user_id).first()
    if not limits:
        return DEFAULT_LIMITS
    return {
        'per_minute': limits.per_minute or DEFAULT_LIMITS['per_minute'],
        'per_hour': limits.per_hour or DEFAULT_LIMITS['per_hour'],
        'per_day': limits.per_day or DEFAULT_LIMITS['per_day'],
        'per_week': limits.per_week or DEFAULT_LIMITS['per_week'],
        'per_month': limits.per_month or DEFAULT_LIMITS['per_month'],
    }

def count_requests(db: Session, user_id: int, since: datetime):
    return db.query(func.count(LLMRequestLog.id)).filter(
        and_(LLMRequestLog.user_id == user_id, LLMRequestLog.created_at >= since)
    ).scalar()

# Función principal para chequear los límites

def check_llm_limits(db: Session, user_id: int):
    now = datetime.utcnow()
    limits = get_user_limits(db, user_id)
    windows = {
        'per_minute': now - timedelta(minutes=1),
        'per_hour': now - timedelta(hours=1),
        'per_day': now - timedelta(days=1),
        'per_week': now - timedelta(weeks=1),
        'per_month': now - timedelta(days=30),
    }
    for key, since in windows.items():
        count = count_requests(db, user_id, since)
        if count >= limits[key]:
            return key, limits[key]
    return None, None

def log_llm_request(db: Session, user_id: int):
    log = LLMRequestLog(user_id=user_id)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
