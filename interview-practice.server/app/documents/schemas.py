import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.models import DocumentType

DocumentName = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)
]


class DocumentPublic(BaseModel):
    """Response shape. Omits `raw_text` (large) and `file_path` (a server path)."""

    id: uuid.UUID
    type: DocumentType
    name: str
    source_filename: str
    saved: bool
    created_at: datetime


class DocumentListQuery(BaseModel):
    type: DocumentType | None = None


class DocumentCreateForm(BaseModel):
    """The non-file fields of the multipart upload."""

    type: DocumentType
    name: DocumentName | None = None
    save: bool


class DocumentRename(BaseModel):
    name: DocumentName
