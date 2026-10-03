from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
    false,
    func,
)
from sqlalchemy.ext.orderinglist import ordering_list
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.extensions import Base, uuid_pk

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.evaluation import Evaluation
    from app.models.evaluation_criterion import EvaluationCriterion
    from app.models.interview_phase_settings import InterviewPhaseSettings
    from app.models.interview_question import InterviewQuestion
    from app.models.interviewer_review import InterviewerReview
    from app.models.job_application import JobApplication
    from app.models.message import Message


class Difficulty(enum.Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class InterviewStatus(enum.Enum):
    in_progress = "in_progress"
    completed = "completed"
    abandoned = "abandoned"


class ResponseStyle(enum.Enum):
    concise = "concise"
    detailed = "detailed"


class Interview(Base):
    __tablename__ = "interviews"

    id: Mapped[uuid.UUID] = uuid_pk()
    job_application_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("job_applications.id", ondelete="CASCADE"), index=True
    )
    job_title: Mapped[str] = mapped_column(String)
    company_name: Mapped[str | None] = mapped_column(String)
    domain: Mapped[str] = mapped_column(String)
    seniority: Mapped[str] = mapped_column(String)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty))
    # tone, interview_type and interviewer_role are plain text so the set of
    # values can grow without an enum migration (see database-schema.md)
    tone: Mapped[str] = mapped_column(String)
    interview_type: Mapped[str] = mapped_column(String)
    interviewer_role: Mapped[str] = mapped_column(String)
    target_question_count: Mapped[int]
    status: Mapped[InterviewStatus] = mapped_column(Enum(InterviewStatus))
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    persona_name: Mapped[str] = mapped_column(String)
    persona_title: Mapped[str] = mapped_column(String)
    persona_backstory: Mapped[str] = mapped_column(Text)
    persona_image_path: Mapped[str] = mapped_column(String)
    job_description_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), index=True
    )
    cv_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), index=True
    )
    cover_letter_document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), index=True
    )
    coaching_helpers_enabled: Mapped[bool] = mapped_column(
        Boolean, server_default=false()
    )
    response_style: Mapped[ResponseStyle] = mapped_column(
        Enum(ResponseStyle), server_default=ResponseStyle.concise.value
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    job_application: Mapped[JobApplication | None] = relationship(
        back_populates="interviews"
    )
    job_description_document: Mapped[Document | None] = relationship(
        foreign_keys=[job_description_document_id]
    )
    cv_document: Mapped[Document | None] = relationship(foreign_keys=[cv_document_id])
    cover_letter_document: Mapped[Document | None] = relationship(
        foreign_keys=[cover_letter_document_id]
    )
    phase_settings: Mapped[list[InterviewPhaseSettings]] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    questions: Mapped[list[InterviewQuestion]] = relationship(
        back_populates="interview",
        order_by="InterviewQuestion.sequence",
        collection_class=ordering_list("sequence", count_from=1),
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    evaluation_criteria: Mapped[list[EvaluationCriterion]] = relationship(
        back_populates="interview",
        order_by="EvaluationCriterion.sequence",
        collection_class=ordering_list("sequence", count_from=1),
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    messages: Mapped[list[Message]] = relationship(
        back_populates="interview",
        order_by="Message.sequence",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    evaluation: Mapped[Evaluation | None] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    interviewer_review: Mapped[InterviewerReview | None] = relationship(
        back_populates="interview",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def phase_settings_override(self) -> dict[str, dict[str, Any]]:
        """The overrides as `{phase: {setting: value}}`, set fields only."""
        return {
            row.phase.value: {
                name: value
                for name in ("model", "temperature", "max_tokens", "reasoning_effort")
                if (value := getattr(row, name)) is not None
            }
            for row in self.phase_settings
        }
