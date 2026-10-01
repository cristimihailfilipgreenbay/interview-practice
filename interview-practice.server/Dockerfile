FROM python:3.12-slim

RUN pip install --no-cache-dir uv

WORKDIR /app

# Dependencies first, so this layer only rebuilds when they actually change.
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

EXPOSE 5000

# Real WSGI server, not flask run's dev server — see ../docs/deployment.md.
# Once flask-migrate is added, this becomes `uv run flask db upgrade && uv run gunicorn ...`.
CMD ["uv", "run", "gunicorn", "--bind", "0.0.0.0:5000", "app.app:app"]
