import os

from flask import Flask
from flask_cors import CORS

from app import models  # noqa: F401  (registers models so Alembic sees them)
from app.documents import documents_bp
from app.errors.handlers import register_error_handlers
from app.extensions import db, migrate
from config import Config


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    client_host = os.environ.get("CLIENT_HOST")
    client_port = os.environ.get("CLIENT_PORT")
    CORS(app, origins=[f"http://{client_host}:{client_port}"])

    db.init_app(app)
    migrate.init_app(app, db)

    register_error_handlers(app)
    app.register_blueprint(documents_bp)

    @app.route("/")
    def hello_world() -> str:
        return "Hello World!"

    return app
