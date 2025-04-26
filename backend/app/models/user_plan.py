from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class UserPlan(Base):
    __tablename__ = "user_plans"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), nullable=False, index=True)
    plan_name = Column(String, nullable=False)  # Ej: 'free', 'premium', 'pro', etc.
    is_active = Column(Boolean, default=True)
    credits = Column(Integer, default=0)  # Créditos disponibles para LLM
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", backref="plans")
