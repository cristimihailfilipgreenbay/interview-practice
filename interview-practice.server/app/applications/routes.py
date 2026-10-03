from flask import jsonify
from flask.typing import ResponseReturnValue
from sqlalchemy import select
from sqlalchemy.orm import joinedload, selectinload

from app.applications import applications_bp
from app.applications.schemas import ApplicationSummary
from app.extensions import db
from app.models import JobApplication
from app.serialization import to_json_list


@applications_bp.get("")
def list_applications() -> ResponseReturnValue:
    statement = (
        select(JobApplication)
        .options(
            selectinload(JobApplication.interviews),
            joinedload(JobApplication.job_description_document),
            joinedload(JobApplication.cv_document),
            joinedload(JobApplication.cover_letter_document),
        )
        .order_by(JobApplication.created_at.desc())
    )
    applications = db.session.scalars(statement)
    return jsonify(to_json_list(ApplicationSummary, applications))
