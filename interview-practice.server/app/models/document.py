import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.extensions import Base, uuid_pk


class DocumentType(enum.Enum):
    cv = "cv"
    cover_letter = "cover_letter"
    job_description = "job_description"


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    type: Mapped[DocumentType] = mapped_column(Enum(DocumentType))
    name: Mapped[str] = mapped_column(String)
    raw_text: Mapped[str] = mapped_column(Text)
    source_filename: Mapped[str] = mapped_column(String)
    file_path: Mapped[str] = mapped_column(String)
    saved: Mapped[bool] = mapped_column(Boolean, server_default=false())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
