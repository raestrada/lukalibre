from sqlalchemy import Column, Integer, ForeignKey, DateTime
from sqlalchemy.sql import func
from app.db.base_class import Base

class UserLLMLimit(Base):
    __tablename__ = "user_llm_limits"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), unique=True, nullable=False)
    per_minute = Column(Integer, default=5)
    per_hour = Column(Integer, default=30)
    per_day = Column(Integer, default=100)
    per_week = Column(Integer, default=400)
    per_month = Column(Integer, default=1000)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
