from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    SmallInteger,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.interview import Interview


class InterviewerReview(Base):
    __tablename__ = "interviewer_reviews"
    __table_args__ = tuple(
        CheckConstraint(f"{column} BETWEEN 1 AND 5", name=f"ck_{column}_1_5")
        for column in (
            "score_question_relevance",
            "score_persona_consistency",
            "score_pacing",
        )
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    interview_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE"), unique=True
    )
    judge_model: Mapped[str] = mapped_column(
        String, server_default="google/gemini-2.5-flash"
    )
    score_question_relevance: Mapped[int] = mapped_column(SmallInteger)
    score_persona_consistency: Mapped[int] = mapped_column(SmallInteger)
    score_pacing: Mapped[int] = mapped_column(SmallInteger)
    reasoning: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    interview: Mapped[Interview] = relationship(back_populates="interviewer_review")
