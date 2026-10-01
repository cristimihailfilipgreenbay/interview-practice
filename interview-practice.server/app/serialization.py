from collections.abc import Iterable
from typing import Any

from pydantic import BaseModel


def to_json(schema: type[BaseModel], obj: object) -> dict[str, Any]:
    """Map an object (typically an ORM model) to the JSON-safe dict `schema` defines.

    Only the fields declared on `schema` are copied, so anything it leaves out can
    never leak into a response; enums, UUIDs and datetimes are converted to their JSON
    forms (ISO 8601 for datetimes).
    """
    return schema.model_validate(obj, from_attributes=True).model_dump(mode="json")


def to_json_list(
    schema: type[BaseModel], objs: Iterable[object]
) -> list[dict[str, Any]]:
    return [to_json(schema, obj) for obj in objs]
