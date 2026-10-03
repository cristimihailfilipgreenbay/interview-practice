from collections.abc import Mapping
from typing import Any

from app.errors.exceptions import ConflictError
from app.llm.openrouter import CompletionSettings

DEFAULT_INTERVIEW_MODEL = "gpt-5-mini"
DEFAULT_JUDGE_MODEL = "google/gemini-2.5-flash"

# Phases whose output is "the interviewer" the judge scores (ADR 0009).
INTERVIEWER_PHASES = ("question_plan", "live_conversation")


def effective_model(
    phase_settings_override: Mapping[str, Any] | None,
    phase: str,
    default: str,
) -> str:
    """The model a phase will run on: its override if set, else `default`."""
    settings = (phase_settings_override or {}).get(phase) or {}
    model = settings.get("model")
    return model if isinstance(model, str) and model else default


def completion_settings(
    phase_settings_override: Mapping[str, Any] | None, phase: str
) -> CompletionSettings:
    """The per-call LLM settings a phase's override asks for (unset ones stay None)."""
    settings = (phase_settings_override or {}).get(phase) or {}
    return CompletionSettings(
        temperature=settings.get("temperature"),
        max_tokens=settings.get("max_tokens"),
        reasoning_effort=settings.get("reasoning_effort"),
    )


def ensure_judge_differs_from_interviewer(
    phase_settings_override: Mapping[str, Any] | None,
    *,
    interview_model: str = DEFAULT_INTERVIEW_MODEL,
    judge_model: str = DEFAULT_JUDGE_MODEL,
) -> None:
    """Enforce ADR 0009: the judge may not be a model that ran the interview.

    `phase_settings_override` is the snake_case `Interview.phase_settings_override`
    shape. Phases without an override fall back to the given Preferences defaults.
    """
    judge = effective_model(phase_settings_override, "interviewer_review", judge_model)
    interviewers = {
        phase: effective_model(phase_settings_override, phase, interview_model)
        for phase in INTERVIEWER_PHASES
    }
    collisions = sorted(p for p, model in interviewers.items() if model == judge)
    if collisions:
        raise ConflictError(
            f"The judge model '{judge}' is also the interviewer model for "
            f"{', '.join(collisions)}. Pick a different judge model.",
            details={"judgeModel": judge, "phases": collisions},
            code="JUDGE_MODEL_COLLISION",
        )


def ensure_preferences_judge_differs(interview_model: str, judge_model: str) -> None:
    """Same rule for the global Preferences pair (`interviewModel` / `judgeModel`)."""
    if interview_model == judge_model:
        raise ConflictError(
            f"The judge model '{judge_model}' cannot be the interview model.",
            details={"judgeModel": judge_model},
            code="JUDGE_MODEL_COLLISION",
        )
