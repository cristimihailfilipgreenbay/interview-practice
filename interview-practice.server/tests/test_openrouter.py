import json

import httpx
import pytest
from pydantic import BaseModel

from app.errors.exceptions import (
    InputRejectedError,
    LlmTimeoutError,
    LlmUnavailableError,
    LlmUpstreamError,
)
from app.llm.openrouter import ChatMessage, CompletionSettings, OpenRouterClient

MESSAGES = [ChatMessage("user", "hi")]


def make_client(
    handler: httpx.MockTransport | None = None,
    *,
    key: str | None = "k",
) -> OpenRouterClient:
    return OpenRouterClient(
        base_url="https://llm.test/api/v1", api_key=lambda: key, transport=handler
    )


def reply(content: object = "hello", **extra: object) -> dict[str, object]:
    return {
        "model": "m",
        "choices": [{"message": {"content": content}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 3, "completion_tokens": 4},
        **extra,
    }


def test_chat_sends_settings_and_parses_reply() -> None:
    seen: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["Authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json=reply())

    client = make_client(httpx.MockTransport(handler))
    result = client.chat(
        "gpt-5-mini",
        MESSAGES,
        CompletionSettings(temperature=0.2, max_tokens=50, reasoning_effort="low"),
        json_mode=True,
    )
    assert seen["url"] == "https://llm.test/api/v1/chat/completions"
    assert seen["auth"] == "Bearer k"
    assert seen["body"] == {
        "model": "gpt-5-mini",
        "messages": [{"role": "user", "content": "hi"}],
        "temperature": 0.2,
        "max_tokens": 50,
        "reasoning": {"effort": "low"},
        "response_format": {"type": "json_object"},
    }
    assert (result.content, result.prompt_tokens, result.completion_tokens) == (
        "hello",
        3,
        4,
    )


def test_unset_settings_are_omitted() -> None:
    bodies: list[dict[str, object]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        bodies.append(json.loads(request.content))
        return httpx.Response(200, json=reply())

    make_client(httpx.MockTransport(handler)).chat("m", MESSAGES)
    assert set(bodies[0]) == {"model", "messages"}


class Plan(BaseModel):
    domain: str


def test_structured_validates() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(200, json=reply('{"domain": "backend"}'))
    )
    assert make_client(transport).chat_structured(Plan, "m", MESSAGES).domain == (
        "backend"
    )


def test_structured_rejects_contract_violation() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(200, json=reply('{"nope": 1}'))
    )
    with pytest.raises(LlmUpstreamError):
        make_client(transport).chat_structured(Plan, "m", MESSAGES)


def error_response(status: int, **extra: object) -> httpx.MockTransport:
    return httpx.MockTransport(
        lambda _: httpx.Response(
            status, json={"error": {"code": status, "message": "boom", **extra}}
        )
    )


@pytest.mark.parametrize("status", [401, 402, 429, 503])
def test_capacity_and_credit_errors_are_503(status: int) -> None:
    with pytest.raises(LlmUnavailableError) as exc:
        make_client(error_response(status)).chat("m", MESSAGES)
    assert exc.value.status == 503
    assert "boom" not in exc.value.message  # upstream text isn't leaked


def test_retry_after_is_passed_on() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            429, headers={"Retry-After": "7"}, json={"error": {"message": "slow"}}
        )
    )
    with pytest.raises(LlmUnavailableError) as exc:
        make_client(transport).chat("m", MESSAGES)
    assert exc.value.details == {"retryAfterSeconds": 7}


def test_moderation_403_becomes_input_rejected() -> None:
    transport = error_response(403, metadata={"reasons": ["violence"]})
    with pytest.raises(InputRejectedError) as exc:
        make_client(transport).chat("m", MESSAGES)
    assert exc.value.status == 422
    assert exc.value.details == {"reason": "moderation"}


def test_plain_403_is_unavailable() -> None:
    with pytest.raises(LlmUnavailableError):
        make_client(error_response(403)).chat("m", MESSAGES)


def test_provider_failure_is_502() -> None:
    with pytest.raises(LlmUpstreamError):
        make_client(error_response(502)).chat("m", MESSAGES)


def test_error_finish_reason_with_200_is_502() -> None:
    body = {"choices": [{"message": {"content": ""}, "finish_reason": "error"}]}
    transport = httpx.MockTransport(lambda _: httpx.Response(200, json=body))
    with pytest.raises(LlmUpstreamError):
        make_client(transport).chat("m", MESSAGES)


def test_non_json_body_is_502() -> None:
    transport = httpx.MockTransport(lambda _: httpx.Response(200, text="<html>"))
    with pytest.raises(LlmUpstreamError):
        make_client(transport).chat("m", MESSAGES)


def test_timeout_is_504() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow", request=request)

    with pytest.raises(LlmTimeoutError):
        make_client(httpx.MockTransport(handler)).chat("m", MESSAGES)


def test_connection_error_is_502() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("down", request=request)

    with pytest.raises(LlmUpstreamError):
        make_client(httpx.MockTransport(handler)).chat("m", MESSAGES)


def test_missing_key_is_503_without_calling_out() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise AssertionError("must not call the provider without a key")

    with pytest.raises(LlmUnavailableError):
        make_client(httpx.MockTransport(handler), key=None).chat("m", MESSAGES)
