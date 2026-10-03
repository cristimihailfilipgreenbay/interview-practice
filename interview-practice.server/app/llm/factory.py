from pathlib import Path

from flask import current_app

from app.llm.openrouter import OpenRouterClient


def _read_api_key() -> str | None:
    """Docker passes the key as a secret file (OPENROUTER_API_KEY_FILE); local dev
    outside Docker can set OPENROUTER_API_KEY in the shell. See docs/deployment.md."""
    key_file = current_app.config["OPENROUTER_API_KEY_FILE"]
    if key_file:
        path = Path(key_file)
        return path.read_text().strip() if path.is_file() else None
    key: str | None = current_app.config["OPENROUTER_API_KEY"]
    return key


def get_llm_client() -> OpenRouterClient:
    """The app-wide client, created on first use."""
    extensions = current_app.extensions
    if "llm_client" not in extensions:
        extensions["llm_client"] = OpenRouterClient(
            base_url=current_app.config["OPENROUTER_BASE_URL"],
            api_key=_read_api_key,
            timeout=current_app.config["LLM_TIMEOUT_SECONDS"],
        )
    client: OpenRouterClient = extensions["llm_client"]
    return client
