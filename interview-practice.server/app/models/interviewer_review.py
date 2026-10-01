from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.interview import Interview


class InterviewerReview(Base):
    __tablename__ = "interviewer_reviews"

    id: Mapped[uuid.UUID] = uuid_pk()
    interview_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), unique=True
    )
    judge_model: Mapped[str] = mapped_column(
        String, server_default="google/gemini-2.5-flash"
    )
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB)
    reasoning: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    interview: Mapped[Interview] = relationship(back_populates="interviewer_review")
