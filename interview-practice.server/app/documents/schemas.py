import uuid
from datetime import datetime
from typing import Annotated

from pydantic import StringConstraints

from app.models import DocumentType
from app.serialization import ApiModel

DocumentName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class DocumentPublic(ApiModel):
    """Response shape. Omits `raw_text` (large) and `file_path` (a server path)."""

    id: uuid.UUID
    type: DocumentType
    name: str
    source_filename: str
    saved: bool
    created_at: datetime


class DocumentListQuery(ApiModel):
    type: DocumentType | None = None


class DocumentCreateForm(ApiModel):
    """The non-file fields of the multipart upload."""

    type: DocumentType
    name: DocumentName | None = None
    save: bool


class DocumentRename(ApiModel):
    name: DocumentName
