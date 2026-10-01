#!/usr/bin/env bash
# Runs Flask-Migrate (Alembic) commands against the database described by .env.
# Run from anywhere; see ../../docs/database-schema.md ("Migrations") for the workflow.
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
    cat <<'EOF'
Usage: scripts/db.sh <command> [args]

  migrate "<message>"   Generate a new migration from model changes (does NOT apply it)
  upgrade [revision]    Apply pending migrations (default: head)
  downgrade [revision]  Undo migrations (default: -1, the latest one); asks to confirm
  current               Show the revision the database is at
  history               List all migrations
  init                  Create the migrations/ folder (once per project; already done)

Reads POSTGRES_* from .env (copy .env.dev to .env first).
EOF
}

if [[ $# -lt 1 || $1 == -h || $1 == --help ]]; then
    usage
    exit 0
fi

if [[ ! -f .env ]]; then
    echo "error: .env not found. Run: cp .env.dev .env" >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

missing=()
for var in POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB POSTGRES_HOST POSTGRES_PORT; do
    [[ -n ${!var:-} ]] || missing+=("$var")
done
if [[ ${#missing[@]} -gt 0 ]]; then
    echo "error: missing in .env: ${missing[*]}" >&2
    exit 1
fi

# Find a way to run Flask: uv if it is on PATH or in a usual install spot (IDE and
# non-login shells often miss ~/.local/bin), else the project's own virtualenv.
find_uv() {
    local candidate
    for candidate in "$(command -v uv || true)" "$HOME/.local/bin/uv" \
        "$HOME/.cargo/bin/uv" /opt/homebrew/bin/uv /usr/local/bin/uv; do
        if [[ -n $candidate && -x $candidate ]]; then
            echo "$candidate"
            return 0
        fi
    done
    return 1
}

flask_db() {
    local uv_bin
    if uv_bin=$(find_uv); then
        "$uv_bin" run flask --app app.app db "$@"
    elif [[ -x .venv/bin/flask ]]; then
        .venv/bin/flask --app app.app db "$@"
    else
        echo "error: neither 'uv' nor .venv/bin/flask found." >&2
        echo "Install uv (https://docs.astral.sh/uv/) and run 'uv sync' in this folder." >&2
        exit 1
    fi
}

command=$1
shift

# Fail early with a readable message instead of a driver stack trace.
if [[ $command != init ]] && ! (exec 3<>"/dev/tcp/${POSTGRES_HOST}/${POSTGRES_PORT}") 2>/dev/null; then
    echo "error: cannot reach Postgres at ${POSTGRES_HOST}:${POSTGRES_PORT}." >&2
    echo "Is the database up? Try: docker compose up -d db" >&2
    exit 1
fi

case $command in
    migrate)
        if [[ $# -lt 1 ]]; then
            echo 'error: a message is required, e.g. scripts/db.sh migrate "add foo to documents"' >&2
            exit 1
        fi
        flask_db migrate -m "$1"
        echo
        echo "Review the new file in migrations/versions/ BEFORE running: scripts/db.sh upgrade"
        ;;
    upgrade)
        flask_db upgrade "${1:-head}"
        ;;
    downgrade)
        target=${1:--1}
        if [[ -t 0 ]]; then
            read -r -p "Downgrade to '${target}'? This can DROP tables and data. [y/N] " answer
            [[ $answer == [yY] ]] || { echo "Aborted."; exit 1; }
        fi
        flask_db downgrade -- "$target" # "--" so a target like -1 is not read as an option
        ;;
    current)
        flask_db current
        ;;
    history)
        flask_db history
        ;;
    init)
        flask_db init
        ;;
    *)
        echo "error: unknown command '${command}'" >&2
        usage >&2
        exit 1
        ;;
esac
