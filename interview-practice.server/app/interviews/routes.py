import uuid

from flask import jsonify, request
from flask.typing import ResponseReturnValue

from app.errors.exceptions import BadRequestError, NotFoundError
from app.extensions import db
from app.interviews import interviews_bp
from app.interviews.generation import generate_interview_setup
from app.interviews.model_rules import ensure_judge_differs_from_interviewer
from app.interviews.schemas import (
    ExistingJobApplication,
    InterviewCreate,
    InterviewPublic,
)
from app.models import (
    Document,
    DocumentType,
    Interview,
    InterviewStatus,
    JobApplication,
)
from app.serialization import to_json


def _load_document(
    document_id: uuid.UUID | None, expected: DocumentType
) -> Document | None:
    if document_id is None:
        return None
    document = db.session.get(Document, document_id)
    if document is None:
        raise BadRequestError("Document not found.", code="DOCUMENT_NOT_FOUND")
    if document.type != expected:
        raise BadRequestError(
            f"expected a {expected.value} Document, got {document.type.value}."
        )
    return document


@interviews_bp.post("")
def create_interview() -> ResponseReturnValue:
    body = InterviewCreate.model_validate(request.get_json(silent=True) or {})
    override = (
        body.phase_settings_override.to_storage()
        if body.phase_settings_override
        else {}
    )
    ensure_judge_differs_from_interviewer(override)

    job_description = _load_document(
        body.job_description_id, DocumentType.job_description
    )
    cv = _load_document(body.cv_id, DocumentType.cv)
    cover_letter = _load_document(body.cover_letter_id, DocumentType.cover_letter)

    setup = generate_interview_setup(
        job_title=body.job_title,
        seniority=body.seniority,
        interviewer_role=body.interviewer_role,
        job_description=job_description,
        cv=cv,
        cover_letter=cover_letter,
        with_company=body.company_name is None or len(body.company_name) == 0,
        phase_settings_override=override,
    )

    application: JobApplication | None = None
    if isinstance(body.job_application, ExistingJobApplication):
        application = db.session.get(JobApplication, body.job_application.id)
        if application is None:
            raise NotFoundError("Job application not found.")
    elif body.job_application is not None:
        application = JobApplication(
            company_name=body.company_name or setup.company_name,
            job_title=body.job_title,
            job_description_document=job_description,
            cv_document=cv,
            cover_letter_document=cover_letter,
        )
        db.session.add(application)

    interview = Interview(
        job_application=application,
        job_title=body.job_title,
        company_name=body.company_name,
        domain=setup.domain,
        seniority=body.seniority,
        difficulty=body.difficulty,
        tone=body.tone,
        interview_type=body.interview_type,
        interviewer_role=body.interviewer_role,
        target_question_count=body.target_question_count,
        status=InterviewStatus.in_progress,
        persona_name=setup.persona_name,
        persona_title=setup.persona_title,
        persona_image_path=setup.persona_image_path,
        job_description_document=job_description,
        cv_document=cv,
        cover_letter_document=cover_letter,
        coaching_helpers_enabled=body.coaching_helpers_enabled,
        response_style=body.response_style,
        evaluation_criteria=setup.evaluation_criteria,
        phase_settings_override=override,
    )
    db.session.add(interview)
    db.session.commit()

    return jsonify(to_json(InterviewPublic, interview)), 201
