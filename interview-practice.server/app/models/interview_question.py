from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.interview import Interview


class InterviewCategory(enum.Enum):
    """The two halves of a question plan and of the evaluation criteria."""

    technical = "technical"
    behavioral = "behavioral"


class InterviewQuestion(Base):
    """One entry of an Interview's question plan (phase 2)."""

    __tablename__ = "interview_questions"
    __table_args__ = (UniqueConstraint("interview_id", "sequence"),)

    id: Mapped[uuid.UUID] = uuid_pk()
    interview_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interviews.id", ondelete="CASCADE")
    )
    sequence: Mapped[int]
    category: Mapped[InterviewCategory] = mapped_column(Enum(InterviewCategory))
    question: Mapped[str] = mapped_column(Text)

    interview: Mapped[Interview] = relationship(back_populates="questions")
