import uuid
from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import ConfigDict, Field, StringConstraints

from app.llm.guard import guarded
from app.models import Difficulty, InterviewStatus, ResponseStyle
from app.serialization import ApiModel

ShortText = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]
# Free text that is later fed to the LLM, so it goes through the security guard.
GuardedText = Annotated[ShortText, guarded()]


class PhaseSettings(ApiModel):
    """Per-phase LLM overrides; any field left out falls back to Preferences."""

    model_config = ConfigDict(extra="forbid")

    model: ShortText | None = None
    temperature: float | None = Field(default=None, ge=0, le=2)
    max_tokens: int | None = Field(default=None, ge=1)
    reasoning_effort: ShortText | None = None


class PhaseSettingsOverride(ApiModel):
    model_config = ConfigDict(extra="forbid")

    jd_analysis: PhaseSettings | None = None
    question_plan: PhaseSettings | None = None
    live_conversation: PhaseSettings | None = None
    ask_back: PhaseSettings | None = None
    evaluation: PhaseSettings | None = None
    interviewer_review: PhaseSettings | None = None

    def to_storage(self) -> dict[str, Any]:
        """The snake_case JSONB shape stored on `Interview.phase_settings_override`."""
        return self.model_dump(by_alias=False, exclude_none=True)


class ExistingJobApplication(ApiModel):
    model_config = ConfigDict(extra="forbid")

    id: uuid.UUID


class NewJobApplication(ApiModel):
    model_config = ConfigDict(extra="forbid")

    create_new: Literal[True]


class InterviewCreate(ApiModel):
    model_config = ConfigDict(extra="forbid")

    job_title: GuardedText
    company_name: GuardedText | None = None
    seniority: GuardedText
    difficulty: Difficulty
    target_question_count: int = Field(ge=1, le=30)
    tone: Literal["strict", "neutral", "friendly"]
    interview_type: GuardedText
    interviewer_role: Literal["recruiter", "technical_screener", "hr", "hiring_manager"]
    response_style: ResponseStyle
    coaching_helpers_enabled: bool
    job_description_id: uuid.UUID | None = None
    cv_id: uuid.UUID | None = None
    cover_letter_id: uuid.UUID | None = None
    job_application: ExistingJobApplication | NewJobApplication | None = None
    phase_settings_override: PhaseSettingsOverride | None = None


class InterviewPublic(ApiModel):
    """Response shape. Omits `evaluation_criteria`, which the candidate must not see."""

    id: uuid.UUID
    job_application_id: uuid.UUID | None
    job_title: str
    company_name: str | None
    domain: str
    seniority: str
    difficulty: Difficulty
    tone: str
    interview_type: str
    interviewer_role: str
    target_question_count: int
    status: InterviewStatus
    persona_name: str
    persona_title: str
    persona_image_path: str
    job_description_document_id: uuid.UUID | None
    cv_document_id: uuid.UUID | None
    cover_letter_document_id: uuid.UUID | None
    coaching_helpers_enabled: bool
    response_style: ResponseStyle
    phase_settings_override: dict[str, Any]
    last_activity_at: datetime
    created_at: datetime
