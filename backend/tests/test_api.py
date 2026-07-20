import os
import atexit
import shutil
import tempfile
from uuid import uuid4

import pytest
from starlette.websockets import WebSocketDisconnect

os.environ["PROXIMA_STORAGE_BACKEND"] = "local"
os.environ["OPENAI_API_KEY"] = ""
os.environ["PROXIMA_JWT_SECRET"] = "test-only-secret-that-is-long-enough-for-auth"
os.environ["PROXIMA_EXPOSE_RESET_TOKEN"] = "true"
TEST_DATA_DIR = tempfile.mkdtemp(prefix="proxima-test-")
os.environ["PROXIMA_DATA_DIR"] = TEST_DATA_DIR
atexit.register(shutil.rmtree, TEST_DATA_DIR, ignore_errors=True)

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)
PASSWORD = "secret1"


def headers() -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": f"test-{uuid4()}@example.com", "password": PASSWORD},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_health_and_core_discovery() -> None:
    assert client.get("/health").json()["status"] == "ok"
    assert client.get("/api/v1/health").json()["status"] == "ok"
    tools = client.get("/api/v1/tools", headers=headers()).json()["items"]
    assert len(tools) == 8
    assert next(item for item in tools if item["name"] == "whatsapp")["connectionRequired"] is False
    assert client.get("/api/v1/metrics", headers=headers()).status_code == 200


def test_slack_oauth_scopes_match_the_configured_slack_app() -> None:
    tools = client.get("/api/v1/tools", headers=headers()).json()["items"]
    slack = next(item for item in tools if item["name"] == "slack")
    assert slack["scopes"] == ["chat:write", "channels:manage", "groups:read", "users:read", "incoming-webhook"]


def test_root_swagger_aliases_reach_the_api_schema() -> None:
    root = client.get("/", follow_redirects=True)
    docs = client.get("/docs", follow_redirects=True)
    schema = client.get("/openapi.json", follow_redirects=True)
    assert root.status_code == 200
    assert "Swagger UI" in root.text
    assert docs.status_code == 200
    assert "Swagger UI" in docs.text
    assert schema.status_code == 200
    assert "/health" in schema.json()["paths"]


def test_local_frontend_cors_preflight_is_allowed() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_auth_issues_httponly_browser_cookies() -> None:
    response = client.post("/api/v1/auth/register", json={"email": f"cookie-{uuid4()}@example.com", "password": PASSWORD})
    assert response.status_code == 201
    cookies = response.headers.get("set-cookie", "")
    assert "proxima_access_token=" in cookies and "HttpOnly" in cookies
    assert "proxima_refresh_token=" in cookies and "HttpOnly" in cookies


def test_password_reset_token_is_one_time_and_updates_password() -> None:
    email = f"reset-{uuid4()}@example.com"
    client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD})
    requested = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert requested.status_code == 200 and requested.json().get("resetToken")
    token = requested.json()["resetToken"]
    changed = client.post("/api/v1/auth/reset-password", json={"token": token, "password": "newpass"})
    assert changed.status_code == 200
    assert client.post("/api/v1/auth/reset-password", json={"token": token, "password": "another"}).status_code == 400
    assert client.post("/api/v1/auth/login", json={"email": email, "password": "newpass"}).status_code == 200


def test_password_reset_emails_a_one_time_link_in_production(monkeypatch) -> None:
    from app.routes import auth

    sent: dict[str, str] = {}
    monkeypatch.setattr(auth.settings, "proxima_expose_reset_token", False)
    monkeypatch.setattr(auth.settings, "proxima_smtp_host", "smtp.example.com")
    monkeypatch.setattr(auth.settings, "proxima_smtp_from", "Proxima <support@example.com>")
    monkeypatch.setattr(auth.settings, "proxima_public_app_url", "https://proxima.example.com")
    monkeypatch.setattr(auth, "send_reset_email", lambda email, token: sent.update(email=email, token=token))
    email = f"mail-reset-{uuid4()}@example.com"
    assert client.post("/api/v1/auth/register", json={"email": email, "password": PASSWORD}).status_code == 201
    response = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert response.status_code == 200
    assert "resetToken" not in response.json()
    assert sent["email"] == email and sent["token"]
    reset = client.post("/api/v1/auth/reset-password", json={"token": sent["token"], "password": "newpass"})
    assert reset.status_code == 200


def test_any_local_development_port_can_send_cors_preflight() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3002",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3002"


def test_websocket_requires_access_token_and_supports_heartbeat() -> None:
    with pytest.raises(WebSocketDisconnect) as denied:
        with client.websocket_connect("/ws"):
            pass
    assert denied.value.code == 1008

    response = client.post(
        "/api/v1/auth/register",
        json={"email": f"socket-{uuid4()}@example.com", "password": PASSWORD},
    )
    assert response.status_code == 201
    with client.websocket_connect(f"/ws?token={response.json()['token']}") as websocket:
        assert websocket.receive_json()["type"] == "connected"
        websocket.send_text("ping")
        assert websocket.receive_json()["type"] == "heartbeat"


def test_websocket_receives_owned_workflow_updates() -> None:
    auth = headers()
    with client.websocket_connect(f"/ws?token={auth['Authorization'].removeprefix('Bearer ')}") as websocket:
        assert websocket.receive_json()["type"] == "connected"
        created = client.post("/api/v1/workflows", json={"goalText": "Create a launch brief"}, headers=auth)
        assert created.status_code == 201
        event = websocket.receive_json()
        assert event["type"] == "workflow.updated"
        assert event["workflow"]["id"] == created.json()["id"]


def test_refresh_tokens_cannot_authorize_api_or_websocket_requests() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": f"refresh-{uuid4()}@example.com", "password": PASSWORD},
    )
    assert response.status_code == 201
    refresh_token = response.json()["refreshToken"]
    assert client.get("/api/v1/metrics", headers={"Authorization": f"Bearer {refresh_token}"}).status_code == 401
    with pytest.raises(WebSocketDisconnect) as denied:
        with client.websocket_connect(f"/ws?token={refresh_token}"):
            pass
    assert denied.value.code == 1008


def test_new_passwords_must_be_between_six_and_eight_characters() -> None:
    short = client.post("/api/v1/auth/register", json={"email": f"short-{uuid4()}@example.com", "password": "short"})
    accepted = client.post("/api/v1/auth/register", json={"email": f"valid-{uuid4()}@example.com", "password": "sixsix"})
    long = client.post("/api/v1/auth/register", json={"email": f"long-{uuid4()}@example.com", "password": "toolong99"})
    assert short.status_code == 422
    assert accepted.status_code == 201
    assert long.status_code == 422


def test_social_draft_and_approval_workflow(monkeypatch) -> None:
    auth = headers()
    response = client.post("/api/v1/social/draft", json={"goal":"Launch v2", "platforms":["twitter", "linkedin"]}, headers=auth)
    assert response.status_code == 200
    assert set(response.json()["drafts"]) == {"twitter", "linkedin"}
    image_response = client.post("/api/v1/social/draft", json={"goal":"Launch v2", "platforms":["twitter"], "generate_image":True}, headers=auth)
    assert image_response.status_code == 200
    assert image_response.json()["image"] is None
    assert "not configured" in image_response.json()["imageError"]
    async def broken_image(*_args, **_kwargs):
        raise RuntimeError("provider unavailable")
    from app.routes import social
    monkeypatch.setattr(social.settings, "openai_api_key", "test-key")
    monkeypatch.setattr(social, "generate_image", broken_image)
    provider_response = client.post("/api/v1/social/draft", json={"goal":"Launch v2", "platforms":["twitter"], "generate_image":True}, headers=auth)
    assert provider_response.status_code == 200
    assert "failed" in provider_response.json()["imageError"]
    sample_post = client.post("/api/v1/social/publish", json={"content":{"twitter":"Launch v2"}, "platforms":["twitter"], "image_url":"/social-gallery/hero.png"}, headers=auth)
    assert sample_post.status_code == 202
    assert sample_post.json()["imageUrl"] == "/social-gallery/hero.png"
    workflow = client.post("/api/v1/deploy", json={"goalText":"Launch v2 on Twitter and LinkedIn"}, headers=auth)
    assert workflow.status_code == 201


def test_approval_endpoint_advances_its_social_task() -> None:
    auth = headers()
    workflow = client.post("/api/v1/deploy", json={"goalText": "Launch v2 on Twitter"}, headers=auth).json()
    gate = next(task for task in workflow["tasks"] if task["id"] == "approval-twitter")
    response = client.post(f"/api/v1/approvals/{workflow['id']}:{gate['id']}/approve", headers=auth)
    assert response.status_code == 200
    updated = response.json()
    assert next(task for task in updated["tasks"] if task["id"] == "approval-twitter")["status"] == "done"
    assert next(task for task in updated["tasks"] if task["id"] == "twitter")["status"] == "done"
    assert updated["status"] == "waiting_approval"


def test_intent_endpoint_accepts_the_goal_payload_used_by_the_dashboard() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Launch v2 on Twitter"}, headers=headers())
    assert response.status_code == 200
    assert response.json()["requiresApproval"] is True


def test_intent_preview_uses_human_readable_steps_for_research() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Research competitor pricing and create a report"}, headers=headers())
    assert response.status_code == 200
    assert [task["title"] for task in response.json()["tasks"]] == [
        "Set the research focus",
        "Review credible competitor information",
        "Create a clear comparison report",
    ]


def test_artifact_download_and_prometheus_metrics_are_available() -> None:
    auth = headers()
    workflow = client.post("/api/v1/workflows", json={"goalText": "Create a launch brief"}, headers=auth).json()
    artifact = workflow["artifacts"][0]
    response = client.get(f"/api/v1/workflows/{workflow['id']}/artifacts/{artifact['id']}/download", headers=auth)
    assert response.status_code == 200
    assert response.text == "Create a launch brief"
    assert client.get("/api/v1/metrics/prometheus").status_code == 200
