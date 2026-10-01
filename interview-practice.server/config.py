import os

from flask.cli import load_dotenv

load_dotenv()


class Config:
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql+psycopg://{os.environ['POSTGRES_USER']}:"
        f"{os.environ['POSTGRES_PASSWORD']}@{os.environ['POSTGRES_HOST']}:"
        f"{os.environ['POSTGRES_PORT']}/{os.environ['POSTGRES_DB']}"
    )
    # Largest accepted upload request, in bytes. Flask rejects bigger bodies with a 413
    # and the documents route re-checks the file itself for a clearer message.
    MAX_UPLOAD_BYTES = int(os.environ.get("MAX_UPLOAD_MB", "10")) * 1024 * 1024
    MAX_CONTENT_LENGTH = MAX_UPLOAD_BYTES
