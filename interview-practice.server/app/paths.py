from pathlib import Path

from flask import current_app


def instance_dir() -> Path:
    """The Flask `instance/` folder, where uploads and generated files are stored."""
    # Flask always sets this; the check narrows its `str | None` type for type checkers.
    instance_path = current_app.instance_path
    if instance_path is None:
        raise RuntimeError("Flask instance_path is not set.")
    return Path(instance_path)
